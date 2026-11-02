export default function StudentBackground() {
  return (
    <div className="student-background" aria-hidden="true">
      <div className="hero-video-wrap">
        <img
          src="/campus-background.jpg"
          alt="CMS College Campus"
          className="hero-video"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
      <div className="hero-overlay" />
    </div>
  );
}
