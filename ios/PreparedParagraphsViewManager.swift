import React

@objc(PreparedParagraphsViewManager)
final class PreparedParagraphsViewManager: RCTViewManager {
    override func view() -> UIView! {
        return PreparedParagraphsView()
    }

    override static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
