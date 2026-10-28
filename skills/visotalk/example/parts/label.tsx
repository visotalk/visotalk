// Plain text in the theme's colours; the size is a prop so one component serves a kicker and a note.
export const Label = ({children, size = 56}: {children: string; size?: number}) => (
  <div style={{fontFamily: 'var(--vt-sans)', fontSize: size, lineHeight: 1.2, fontWeight: 700, color: 'var(--vt-text)'}}>{children}</div>
);
