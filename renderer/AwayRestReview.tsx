import { useState } from 'react';
import { StudySession } from '../shared/types';

export default function AwayRestReview({ session }: { session: StudySession }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const rest = session.awayRest;
  if (!rest || session.status === 'paused' || session.status === 'preparing') return null;
  const current = session.status === 'running' && session.index === rest.stepIndex;
  const review = async (accept: boolean) => {
    setBusy(true);
    setError('');
    try {
      await window.screenwell.studyAction({
        type: 'away-rest',
        sessionId: session.id,
        stepIndex: rest.stepIndex,
        accept,
      });
    } catch {
      setError('Couldn’t save your choice. Check the current session and try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="away-rest-review" aria-label="Review time away">
      <p>
        Were you taking a break? The camera didn’t detect a face for {rest.seconds} seconds during a
        scheduled rest.{current && ' Counting it ends the current rest.'}
      </p>
      <div className="session-live-actions">
        <button className="primary" disabled={busy} onClick={() => void review(true)}>
          Count as a break
        </button>
        <button className="secondary" disabled={busy} onClick={() => void review(false)}>
          Dismiss
        </button>
      </div>
      {error && <p role="status">{error}</p>}
    </section>
  );
}
