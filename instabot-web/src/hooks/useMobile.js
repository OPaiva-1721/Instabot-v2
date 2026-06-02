import { useState, useEffect } from 'react'

const BREAKPOINT = 768

export function useMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= BREAKPOINT)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth <= BREAKPOINT)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}
