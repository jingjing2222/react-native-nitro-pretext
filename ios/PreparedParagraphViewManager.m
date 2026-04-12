#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(PreparedParagraphViewManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(preparedId, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(paragraphIndex, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(layoutWidth, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(fontFamily, NSString)
RCT_EXPORT_VIEW_PROPERTY(fontSize, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(lineHeight, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(letterSpacing, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(textColor, UIColor)
RCT_EXPORT_VIEW_PROPERTY(contentInsetLeft, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(contentInsetTop, NSNumber)
@end
