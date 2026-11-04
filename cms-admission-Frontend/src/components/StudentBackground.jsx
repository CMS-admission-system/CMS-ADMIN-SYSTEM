import { useAppContext } from '../context/AppContext';

export default function StudentBackground() {
  const { backgroundSettings } = useAppContext();
  const bgImage = backgroundSettings?.backgroundImageDataUrl || backgroundSettings?.videoDataUrl || '/campus-background.jpg';

  return (
    <div className="student-background" aria-hidden="true">
      <div className="hero-video-wrap">
        <img
          src={bgImage}
          alt="CMS College Campus"
          className="hero-video"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
      <div className="hero-overlay" />
    </div>
  );
}
