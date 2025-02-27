export const LoadingSpinner = ({ darkMode }: { darkMode: boolean }) => (
  <div className="flex flex-col justify-center items-center h-64">
    <span className={`loading loading-spinner loading-lg ${darkMode ? 'text-white' : ''}`}></span>
  </div>
)
