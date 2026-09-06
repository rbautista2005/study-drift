'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock3 } from 'lucide-react';

export function QuestionTimer({ seconds, paused, onExpire }: { seconds: number; paused: boolean; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => {
      if (remaining <= 1) onExpireRef.current();
      else setRemaining((value) => value - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [paused, remaining]);
  return <span className="question-timer"><Clock3 size={13} aria-hidden="true" /> {remaining}s</span>;
}
