/**
 * Reusable IconBox component - colored square container for icons
 * Used throughout the application for consistent icon presentation
 */
export default function IconBox({
  icon: Icon,
  size = 32,
  borderRadius = 10,
  color = '#4F46E5',
  bg = '#EEF2FF',
  iconSize = 16,
  margin = '0',
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        margin,
      }}
    >
      {Icon && <Icon size={iconSize} style={{ color }} />}
    </div>
  )
}