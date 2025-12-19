/**
 * Settings Module
 *
 * Barrel export for the Settings page and related components.
 */

// Main component
export { Settings } from './Settings'

// Hooks
export { useAPIKeyManager, type APIProvider, type ConnectionStatus } from './hooks/useAPIKeyManager'
export { useStockAutocomplete } from './hooks/useStockAutocomplete'
export { usePortfolioHoldings } from './hooks/usePortfolioHoldings'

// Components
export { APIKeyProvider } from './components/APIKeyProvider'

// Sections (for direct imports if needed)
export { MyProfileSection } from './sections/MyProfileSection'
export { PortfolioSection } from './sections/PortfolioSection'
export { DisplaySection } from './sections/DisplaySection'
export { RiskManagementSection } from './sections/RiskManagementSection'
export { AICopilotSection } from './sections/AICopilotSection'
export { APIKeysSection } from './sections/APIKeysSection'
export { NotificationsSection } from './sections/NotificationsSection'
export { RSSFeedsSection } from './sections/RSSFeedsSection'
export { PriceAlertsSection } from './sections/PriceAlertsSection'
export { DangerZoneSection } from './sections/DangerZoneSection'
