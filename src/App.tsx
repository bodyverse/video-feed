import './App.css'
import VideoFeed from './components/VideoFeed'
import { useMemo } from 'react'

function App() {
  const base = (import.meta as any).env?.BASE_URL || '/';
  const path = useMemo(() => {
    const p = window.location.pathname;
    return p.startsWith(base) ? p.slice(base.length - 1) : p; // keep leading '/'
  }, [base]);

  const sheetForVideos = 'https://docs.google.com/spreadsheets/d/1wQUswabehFQq0pEJADeF3_b-6GsqNVAygy22yBG5OeE/edit?gid=0#gid=0';

  const source = useMemo(() => {
    if (path === '/videos') {
      return { sheetCsvUrl: sheetForVideos };
    }
    return undefined;
  }, [path]);

  return (
    <div className="h-full">
      <VideoFeed source={source} />
    </div>
  )
}

export default App
