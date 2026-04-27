// ios/PaqueteStickers/WhatsAppStickerModule.swift
import Foundation
import UIKit

@objc(WhatsAppStickerModule)
class WhatsAppStickerModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { return true }

  @objc func sendPack(_ pack: NSDictionary,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let name = pack["name"] as? String,
          let publisher = pack["publisher"] as? String,
          let stickers = pack["stickers"] as? [[String: Any]],
          let packId = pack["id"] as? String else {
      reject("INVALID_PACK", "Invalid pack data", nil)
      return
    }

    var queryItems = [URLQueryItem]()
    queryItems.append(URLQueryItem(name: "identifier", value: packId))
    queryItems.append(URLQueryItem(name: "name", value: name))
    queryItems.append(URLQueryItem(name: "publisher", value: publisher))

    if let trayPath = pack["trayIconFile"] as? String,
       let trayData = try? Data(contentsOf: URL(fileURLWithPath: trayPath)) {
      queryItems.append(URLQueryItem(name: "tray_image", value: trayData.base64EncodedString()))
    }

    for (i, sticker) in stickers.prefix(30).enumerated() {
      if let imagePath = sticker["imageFile"] as? String,
         let imageData = try? Data(contentsOf: URL(fileURLWithPath: imagePath)) {
        queryItems.append(URLQueryItem(name: "sticker_image_\(i)", value: imageData.base64EncodedString()))
        if let emojis = sticker["emojis"] as? [String] {
          queryItems.append(URLQueryItem(name: "sticker_emojis_\(i)", value: emojis.joined()))
        }
      }
    }

    var components = URLComponents()
    components.scheme = "whatsapp"
    components.host = "stickerPack"
    components.queryItems = queryItems

    guard let url = components.url else {
      reject("URL_ERROR", "Could not build WhatsApp URL", nil)
      return
    }

    DispatchQueue.main.async {
      if UIApplication.shared.canOpenURL(url) {
        UIApplication.shared.open(url, options: [:]) { success in
          if success { resolve(nil) }
          else { reject("OPEN_FAILED", "WhatsApp did not open", nil) }
        }
      } else {
        reject("NOT_INSTALLED", "WhatsApp is not installed", nil)
      }
    }
  }

  @objc func isWhatsAppInstalled(_ resolve: RCTPromiseResolveBlock,
                                  rejecter reject: RCTPromiseRejectBlock) {
    guard let url = URL(string: "whatsapp://") else {
      resolve(false); return
    }
    resolve(UIApplication.shared.canOpenURL(url))
  }
}
