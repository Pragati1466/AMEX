/**
 * Reusable Card component with consistent styling
 * Supports header, body, and footer sections
 */
export default function Card({
  children,
  header,
  footer,
  padding = '24px',
  style = {},
  className = '',
  onClick,
}) {
  return (
    <div
      className={`diq-card ${className}`}
      style={{ overflow: 'hidden', ...style }}
      onClick={onClick}
    >
      {header && (
        <div className="diq-card-header">
          {header}
        </div>
      )}
      <div className="diq-card-body" style={{ padding }}>
        {children}
      </div>
      {footer && (
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--color-border-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}