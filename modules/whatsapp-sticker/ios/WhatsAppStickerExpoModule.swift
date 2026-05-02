import ExpoModulesCore
import UIKit

private let pasteboardType = "net.whatsapp.third-party.sticker-pack"
private let whatsappURL = URL(string: "whatsapp://stickerPack")!

public class WhatsAppStickerExpoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WhatsAppSticker")

    AsyncFunction("sendPack") { (params: [String: Any], promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard
          let identifier = params["identifier"] as? String,
          let name = params["name"] as? String,
          let publisher = params["publisher"] as? String,
          let trayImagePath = params["trayImagePath"] as? String,
          let stickersRaw = params["stickers"] as? [[String: Any]]
        else {
          promise.reject("INVALID_PARAMS", "Missing required pack parameters")
          return
        }

        var json: [String: Any] = [
          "identifier": identifier,
          "name": name,
          "publisher": publisher,
          "ios_app_store_link": NSNull(),
          "android_play_store_link": NSNull(),
        ]

        // Tray icon must be PNG — convert from WebP via UIImage
        if let trayImage = UIImage(contentsOfFile: trayImagePath),
           let pngData = trayImage.pngData() {
          json["tray_image"] = pngData.base64EncodedString()
        }

        // Stickers stay as-is WebP bytes
        var stickersArray: [[String: Any]] = []
        for sticker in stickersRaw {
          guard
            let imagePath = sticker["imagePath"] as? String,
            let emojis = sticker["emojis"] as? [String],
            let webpData = try? Data(contentsOf: URL(fileURLWithPath: imagePath))
          else { continue }
          stickersArray.append(["image_data": webpData.base64EncodedString(), "emojis": emojis])
        }
        json["stickers"] = stickersArray

        guard let jsonData = try? JSONSerialization.data(withJSONObject: json, options: []) else {
          promise.reject("JSON_ERROR", "Failed to serialize pack data")
          return
        }

        DispatchQueue.main.async {
          UIPasteboard.general.setItems(
            [[pasteboardType: jsonData]],
            options: [
              .localOnly: true,
              .expirationDate: NSDate(timeIntervalSinceNow: 60),
            ]
          )

          UIApplication.shared.open(whatsappURL, options: [:]) { success in
            if success {
              promise.resolve()
            } else {
              promise.reject("OPEN_FAILED", "Could not open WhatsApp")
            }
          }
        }
      }
    }
  }
}
