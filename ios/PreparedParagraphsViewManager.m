#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(PreparedParagraphsViewManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(preparedId, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(layoutWidth, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(layoutRequest, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(paragraphCount, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(paragraphGap, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(textColor, UIColor)
RCT_EXPORT_VIEW_PROPERTY(contentInsetLeft, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(contentInsetTop, NSNumber)
@end
