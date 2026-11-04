import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getInitialDraft, DEFAULT_COURSE_SEAT_QUOTAS, normalizeCourseName } from '../utils/helpers';
import { readStorage, writeStorage, resetStorage, STORAGE_KEYS } from '../services/storage';
import {
  fetchApplicationsApi,
  submitApplicationApi,
  updateApplicationApi,
  deleteApplicationApi,
  fetchSettingApi,
  saveSettingApi,
  fetchCourseSeatsApi,
  updateCourseSeatsApi,
  sendApplicationStatusEmail,
  calculateStudentFeeApi,
  fetchFeeConfigApi,
  updateFeeConfigApi,
} from '../services/api';
import { getSocket, subscribeToRealtimeEvents } from '../services/socket';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [auth, setAuth] = useState(() => readStorage(STORAGE_KEYS.cmsAuth, { role: null, username: null }));
  const [draft, setDraft] = useState(() => readStorage(STORAGE_KEYS.cmsDraftApplication, getInitialDraft()));
  const [applications, setApplications] = useState(() => readStorage(STORAGE_KEYS.cmsApplications, []));
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [backgroundSettings, setBackgroundSettings] = useState(() => readStorage(STORAGE_KEYS.cmsBackgroundSettings, {
    enabled: true,
    videoDataUrl: '',
    videoMimeType: '',
    playbackMode: 'muted',
  }));
  const [paymentSettings, setPaymentSettings] = useState(() => {
    const settings = readStorage(STORAGE_KEYS.cmsPaymentSettings, {
      feeAmount: '',
      upiId: 'cms@bank',
      paymentQrs: [null, null],
      feeStructure: null,
    });
    return {
      ...settings,
      upiId: settings.upiId ?? 'cms@bank',
      paymentQrs: settings.paymentQrs || [settings.paymentQr || null, null],
    };
  });
  const [correctionHistory, setCorrectionHistory] = useState(() => readStorage(STORAGE_KEYS.cmsCorrectionHistory, []));
  const [lastSubmitted, setLastSubmitted] = useState(() => readStorage(STORAGE_KEYS.cmsLastSubmittedApplication, null));
  const [courseSeats, setCourseSeats] = useState(() => {
    const initial = {};
    for (const [k, v] of Object.entries(DEFAULT_COURSE_SEAT_QUOTAS)) {
      initial[k] = { total: v, filled: 0, balance: v };
    }
    return initial;
  });

  const [feeConfig, setFeeConfig] = useState(null);
  const [activeFeeBreakdown, setActiveFeeBreakdown] = useState(null);

  const refreshFeeConfig = useCallback(async () => {
    try {
      const cfg = await fetchFeeConfigApi('2026-2027');
      if (cfg) {
        setFeeConfig(cfg);
      }
    } catch (err) {
      console.warn('Failed to load dynamic fee config from server:', err);
    }
  }, []);

  const calculateLiveFee = useCallback(async (studentData) => {
    try {
      const breakdown = await calculateStudentFeeApi(studentData);
      if (breakdown) {
        setActiveFeeBreakdown(breakdown);
        return breakdown;
      }
    } catch (err) {
      console.warn('Live fee calculation error:', err);
    }
    return null;
  }, []);

  // Calculate live filled and balance counts given seat quotas and current applications
  const computeSeatBalances = useCallback((seatMap, appsList) => {
    const filledCounts = {};
    for (const app of appsList) {
      const cname = app.coursePreference?.firstPreference || app.courseName || app.firstPreference || '';
      const norm = normalizeCourseName(cname);
      if (norm) {
        filledCounts[norm] = (filledCounts[norm] || 0) + 1;
      }
    }

    const merged = {};
    const baseQuotas = { ...DEFAULT_COURSE_SEAT_QUOTAS, ...(seatMap || {}) };
    for (const [cName, seatData] of Object.entries(baseQuotas)) {
      const total = typeof seatData === 'object' && seatData !== null && seatData.total !== undefined
        ? Number(seatData.total)
        : Number(seatData || 200);
      const filled = filledCounts[cName] || 0;
      const balance = Math.max(0, total - filled);
      merged[cName] = { total, filled, balance };
    }
    return merged;
  }, []);

  // 1. Centralized Data System: Fetch latest authoritative state from central backend on mount & auth change
  const refreshFromDatabase = useCallback(async () => {
    const serverApps = await fetchApplicationsApi();
    const activeApps = Array.isArray(serverApps) ? serverApps : applications;
    if (Array.isArray(serverApps)) {
      setApplications(serverApps);
    }

    const payVal = await fetchSettingApi('paymentSettings');
    if (payVal) setPaymentSettings(payVal);

    const bgVal = await fetchSettingApi('backgroundSettings');
    if (bgVal) setBackgroundSettings(bgVal);

    const serverSeats = await fetchCourseSeatsApi();
    if (serverSeats && typeof serverSeats === 'object') {
      setCourseSeats(serverSeats);
    } else {
      setCourseSeats((prev) => computeSeatBalances(prev, activeApps));
    }
  }, [applications, computeSeatBalances]);

  useEffect(() => {
    refreshFromDatabase();
    refreshFeeConfig();
  }, [refreshFromDatabase, refreshFeeConfig, auth.role]);

  // Recalculate seat balances whenever applications change locally
  useEffect(() => {
    setCourseSeats((prev) => computeSeatBalances(prev, applications));
  }, [applications, computeSeatBalances]);

  // 2. Real-Time Multi-User Synchronization via Socket.IO
  useEffect(() => {
    getSocket(auth);

    const unsubscribe = subscribeToRealtimeEvents({
      onConnectionStatus: (connected) => {
        setIsLiveConnected(connected);
      },
      onReconnect: () => {
        console.log('[Socket.IO] Reconnected. Reconciling with central database...');
        refreshFromDatabase();
      },
      onApplicationCreated: (newApp) => {
        console.log('[Socket.IO] Real-time: Application created:', newApp.id);
        setApplications((current) => {
          const exists = current.some((a) => a.id === newApp.id);
          if (exists) {
            return current.map((a) => (a.id === newApp.id ? { ...a, ...newApp } : a));
          }
          return [newApp, ...current];
        });
      },
      onApplicationUpdated: (updatedApp) => {
        console.log('[Socket.IO] Real-time: Application updated:', updatedApp.id);
        setApplications((current) => {
          const exists = current.some((a) => a.id === updatedApp.id);
          if (!exists) {
            return [updatedApp, ...current];
          }
          return current.map((a) => (a.id === updatedApp.id ? { ...a, ...updatedApp } : a));
        });
        if (Array.isArray(updatedApp.correctionHistory)) {
          setCorrectionHistory(updatedApp.correctionHistory);
        }
      },
      onApplicationDeleted: ({ id }) => {
        console.log('[Socket.IO] Real-time: Application deleted:', id);
        setApplications((current) => current.filter((a) => a.id !== id));
      },
      onCourseSeatsUpdated: (newSeatsSummary) => {
        console.log('[Socket.IO] Real-time: Course seats updated:', newSeatsSummary);
        if (newSeatsSummary && typeof newSeatsSummary === 'object') {
          setCourseSeats(newSeatsSummary);
        }
      },
      onSettingUpdated: ({ key, value }) => {
        console.log('[Socket.IO] Real-time: Setting updated:', key);
        if (key === 'paymentSettings' && value) {
          setPaymentSettings(value);
        } else if (key === 'backgroundSettings' && value) {
          setBackgroundSettings(value);
        } else if (key === 'course_seats') {
          fetchCourseSeatsApi().then((seats) => {
            if (seats) setCourseSeats(seats);
          });
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [auth, refreshFromDatabase]);

  // Persist local cache for fast offline rendering without overriding central database
  useEffect(() => {
    writeStorage(STORAGE_KEYS.cmsAuth, auth);
  }, [auth]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cmsBackgroundSettings, backgroundSettings);
  }, [backgroundSettings]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cmsPaymentSettings, paymentSettings);
  }, [paymentSettings]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cmsDraftApplication, draft);
  }, [draft]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cmsApplications, applications);
  }, [applications]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cmsCorrectionHistory, correctionHistory);
  }, [correctionHistory]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cmsLastSubmittedApplication, lastSubmitted);
  }, [lastSubmitted]);

  const saveDraft = useCallback((nextDraft) => {
    setDraft({ ...getInitialDraft(), ...nextDraft });
  }, []);

  const updateBackgroundSettings = (nextSettings) => {
    setBackgroundSettings((current) => {
      const updated = typeof nextSettings === 'function' ? nextSettings(current) : nextSettings;
      saveSettingApi('backgroundSettings', updated);
      return updated;
    });
  };

  const updatePaymentSettings = (nextSettings) => {
    setPaymentSettings((current) => {
      const updated = typeof nextSettings === 'function' ? nextSettings(current) : nextSettings;
      saveSettingApi('paymentSettings', updated);
      return updated;
    });
  };

  const loginDemoUser = (role, username) => {
    setAuth({ role, username });
  };

  const logoutDemoUser = () => {
    setAuth({ role: null, username: null });
  };

  const dismissDraft = () => {
    const freshDraft = getInitialDraft();
    setDraft(freshDraft);
    writeStorage(STORAGE_KEYS.cmsDraftApplication, freshDraft);
  };

  const addHistoryEntry = (applicationId, note, actor) => {
    const entry = {
      id: `${applicationId}-${Date.now()}`,
      applicationId,
      note,
      actor,
      createdAt: new Date().toISOString(),
    };
    setCorrectionHistory((current) => [entry, ...current]);
  };

  // 3. Concurrency-safe application update with optimistic locking
  const updateApplication = async (applicationId, updates, comment, actor) => {
    const currentItem = applications.find((item) => item.id === applicationId);
    const expectedVersion = currentItem?.version || 1;

    // Optimistically update local state for instantaneous feedback
    setApplications((current) => {
      const next = current.map((item) => {
        if (item.id !== applicationId) return item;
        return {
          ...item,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      });
      if (comment) {
        addHistoryEntry(applicationId, comment, actor);
      }
      return next;
    });

    // Send update to central backend with expected_version
    const result = await updateApplicationApi(applicationId, updates, comment, actor, expectedVersion);
    if (result && result.ok === false && result.status === 409) {
      alert(`âš ï¸ Concurrent Update Conflict: Application ${applicationId} was modified by another user. Reloading latest records from the server to prevent accidental overwrites.`);
      refreshFromDatabase();
      return { conflict: true };
    }
    return result;
  };

  const getNowIstIso = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(d.getTime() + (d.getTimezoneOffset() * 60 * 1000) + istOffset);
    return `${istTime.getFullYear()}-${pad(istTime.getMonth() + 1)}-${pad(istTime.getDate())}T${pad(istTime.getHours())}:${pad(istTime.getMinutes())}:${pad(istTime.getSeconds())}+05:30`;
  };

  const getSeatInfo = useCallback((courseName) => {
    const norm = normalizeCourseName(courseName);
    if (courseSeats && courseSeats[norm]) {
      return courseSeats[norm];
    }
    const defaultTotal = DEFAULT_COURSE_SEAT_QUOTAS[norm] || 200;
    const filled = applications.filter((app) => {
      const c = app.coursePreference?.firstPreference || app.courseName || '';
      return normalizeCourseName(c) === norm;
    }).length;
    return {
      total: defaultTotal,
      filled,
      balance: Math.max(0, defaultTotal - filled),
    };
  }, [courseSeats, applications]);

  const updateCourseSeats = async (newQuotas) => {
    try {
      const res = await updateCourseSeatsApi(newQuotas, auth.role || 'vc');
      if (res.ok && res.data?.seats) {
        setCourseSeats(res.data.seats);
        return { ok: true, seats: res.data.seats };
      }
      return { ok: false, error: res.error || 'Failed to update course seats' };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const submitApplication = async (formData) => {
    const istNow = getNowIstIso();
    const rawData = {
      ...formData,
      status: formData.status || 'Enquiring',
      submittedAt: istNow,
      updatedAt: istNow,
      confirmationDate: formData.status === 'Confirmed' ? istNow : null,
      correctionNotes: formData.correctionNotes || '',
      coursePreference: formData.coursePreference || { firstPreference: '', additionalPreferences: [] },
    };

    // Central backend atomically assigns YYNNNN ID, persists to MySQL, and broadcasts 'application_created'
    let serverResult = null;
    try {
      serverResult = await submitApplicationApi(rawData);
    } catch (err) {
      console.warn('Backend API call fallback:', err);
    }

    const officialId = serverResult?.id || rawData.formNumber || rawData.id || `CMS-${Date.now()}`;
    const appRecord = {
      ...rawData,
      ...(serverResult || {}),
      id: officialId,
      formNumber: officialId,
    };

    setApplications((current) => {
      const filtered = current.filter((item) => item.id !== officialId);
      const nextApps = [appRecord, ...filtered];
      setCourseSeats((prev) => computeSeatBalances(prev, nextApps));
      return nextApps;
    });

    setLastSubmitted(appRecord);
    setDraft(getInitialDraft());
    writeStorage(STORAGE_KEYS.cmsDraftApplication, getInitialDraft());

    return appRecord;
  };

  const confirmApplication = async (applicationId, actor = 'Admission Officer') => {
    const istNow = getNowIstIso();
    const note = 'Application confirmed by admission office.';
    const currentItem = applications.find((item) => item.id === applicationId);
    const expectedVersion = currentItem?.version || 1;

    setApplications((current) => current.map((item) => {
      if (item.id !== applicationId) return item;
      return {
        ...item,
        status: 'Confirmed',
        confirmedAt: istNow,
        updatedAt: istNow,
      };
    }));
    addHistoryEntry(applicationId, note, actor);
    // Backend commits update to DB first, broadcasts to all connected users, and sends status email
    await updateApplicationApi(applicationId, { status: 'Confirmed' }, note, actor, expectedVersion);
  };

  const deleteApplication = async (applicationId) => {
    setApplications((current) => current.filter((item) => item.id !== applicationId));
    await deleteApplicationApi(applicationId).catch(() => {});
  };

  const forwardApplicationToVC = async (applicationId, actor = 'Admission Officer') => {
    const istNow = getNowIstIso();
    const note = 'Application forwarded to the VC list by the admission office.';
    const currentItem = applications.find((item) => item.id === applicationId);
    const expectedVersion = currentItem?.version || 1;

    setApplications((current) => current.map((item) => {
      if (item.id !== applicationId) return item;
      return {
        ...item,
        status: 'Sent to VC',
        forwardedAt: istNow,
        updatedAt: istNow,
      };
    }));
    addHistoryEntry(applicationId, note, actor);
    await updateApplicationApi(applicationId, { status: 'Sent to VC' }, note, actor, expectedVersion);
  };

  const resetDemoData = () => {
    resetStorage();
    setAuth({ role: null, username: null });
    setDraft(getInitialDraft());
    setApplications([]);
    setBackgroundSettings({ enabled: true, videoDataUrl: '', videoMimeType: '', playbackMode: 'muted' });
    setPaymentSettings({ feeAmount: '', upiId: 'cms@bank', paymentQrs: [null, null], feeStructure: null });
    setCorrectionHistory([]);
    setLastSubmitted(null);
  };

  const value = useMemo(() => ({
    auth,
    draft,
    applications,
    isLiveConnected,
    backgroundSettings,
    paymentSettings,
    courseSeats,
    getSeatInfo,
    updateCourseSeats,
    correctionHistory,
    lastSubmitted,
    saveDraft,
    loginDemoUser,
    logoutDemoUser,
    submitApplication,
    updateApplication,
    confirmApplication,
    deleteApplication,
    forwardApplicationToVC,
    addHistoryEntry,
    dismissDraft,
    resetDemoData,
    refreshFromDatabase,
    setDraft,
    setBackgroundSettings: updateBackgroundSettings,
    setPaymentSettings: updatePaymentSettings,
    feeConfig,
    refreshFeeConfig,
    calculateLiveFee,
    activeFeeBreakdown,
  }), [auth, draft, applications, isLiveConnected, backgroundSettings, paymentSettings, courseSeats, getSeatInfo, correctionHistory, lastSubmitted, saveDraft, refreshFromDatabase, feeConfig, refreshFeeConfig, calculateLiveFee, activeFeeBreakdown]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
