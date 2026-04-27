// ios/PaqueteStickers/WhatsAppStickerModule.m
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WhatsAppStickerModule, NSObject)

RCT_EXTERN_METHOD(sendPack:(NSDictionary *)pack
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isWhatsAppInstalled:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
