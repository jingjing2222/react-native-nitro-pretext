import React

@objc(PreparedParagraphViewManager)
final class PreparedParagraphViewManager: RCTViewManager {
    override func view() -> UIView! {
        return PreparedParagraphView()
    }

    override static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
