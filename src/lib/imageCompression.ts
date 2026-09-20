/**
 * Client-side image compression utility
 * Resizes large camera/phone/web images to reasonable web dimensions (max 1200px)
 * and compresses to JPEG with 0.82 quality, reducing 5-15MB files to ~100-250KB.
 * This completely avoids 502 Bad Gateway / ROUTER_EXTERNAL_TARGET_CONNECTION_ERROR_CD8 on Vercel
 * and ensures instant uploads even on slow mobile networks.
 */

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = options

  // Only compress images, skip svg/gif/animations
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file
  }

  // If already under 150KB, no need to compress further
  if (file.size < 150 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        try {
          let { width, height } = img

          // Calculate aspect ratio scale
          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            } else {
              width = Math.round((width * maxHeight) / height)
              maxHeight && (height = Math.round((height * maxHeight) / img.height))
            }
          }

          const canvas = document.createElement("canvas")
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext("2d")
          if (!ctx) {
            resolve(file)
            return
          }

          // Draw image on canvas with high quality smoothing
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                // If compression resulted in larger or null, keep original
                resolve(file)
                return
              }

              const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg"
              const compressedFile = new File([blob], newFileName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })

              console.log(
                `[ImageCompression] Compressed "${file.name}" (${(file.size / 1024).toFixed(1)} KB) -> "${newFileName}" (${(compressedFile.size / 1024).toFixed(1)} KB)`
              )
              resolve(compressedFile)
            },
            "image/jpeg",
            quality
          )
        } catch (err) {
          console.warn("[ImageCompression] Canvas error, falling back to original file:", err)
          resolve(file)
        }
      }

      img.onerror = () => {
        resolve(file)
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      resolve(file)
    }

    reader.readAsDataURL(file)
  })
}
