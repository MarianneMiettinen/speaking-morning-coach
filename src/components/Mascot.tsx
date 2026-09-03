import { useState } from 'react';

/**
 * The neutral "app host" shown before any coach is picked. Drop
 * /public/characters-art/host.png in to replace the placeholder — no code
 * changes needed.
 */
export function Mascot({ size = 120 }: { size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="mascot" style={{ width: size, height: size }}>
      <img
        src={failed ? '/favicon.svg' : '/characters-art/host.png'}
        alt="Morning Coach"
        onError={() => setFailed(true)}
        style={{
          width: failed ? '62%' : '100%',
          height: failed ? '62%' : '100%',
          objectFit: failed ? 'contain' : 'cover',
          borderRadius: failed ? 0 : '50%',
        }}
      />
    </div>
  );
}
