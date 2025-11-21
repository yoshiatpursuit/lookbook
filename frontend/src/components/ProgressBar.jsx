import { useLoadingProgress } from '../contexts/LoadingProgressContext';

const ProgressBar = () => {
  const { progress, isLoading, isCollapsing } = useLoadingProgress();

  if (!isLoading && !isCollapsing) {
    return null;
  }

  return (
    <div
      className="progress-bar-container"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '20px',
        zIndex: 9999,
        pointerEvents: 'none',
        transform: isCollapsing ? 'scaleY(0)' : 'scaleY(1)',
        transformOrigin: 'bottom',
        transition: isCollapsing ? 'transform 0.5s ease-out' : 'none',
        overflow: 'hidden'
      }}
    >
      <div
        className="progress-bar-fill"
        style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: '#4242ea',
          transition: 'width 0.3s ease-out',
          willChange: 'width'
        }}
      />
    </div>
  );
};

export default ProgressBar;

