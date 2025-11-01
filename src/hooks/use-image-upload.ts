import { useState } from "react";

interface UseImageUploadOptions {
  folder?: string;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    folder = "images",
    maxFileSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"],
  } = options;

  const uploadImage = async (file: File): Promise<string> => {
    if (!file) {
      throw new Error("No file provided");
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    if (file.size > maxFileSize) {
      throw new Error(`File size exceeds ${maxFileSize / 1024 / 1024}MB limit`);
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      
      // Add folder to query parameter
      const folderParam = folder ? `?folder=${encodeURIComponent(folder)}` : "";

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percentComplete);
          }
        });

        // Handle completion
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success && response.url) {
                setUploadProgress(100);
                resolve(response.url);
              } else {
                reject(new Error(response.error || "Upload failed"));
              }
            } catch (parseError) {
              reject(new Error("Failed to parse response"));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        // Handle errors
        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload aborted"));
        });

        // Send request
        xhr.open("POST", `/api/upload/image${folderParam}`);
        xhr.send(formData);
      });
    } catch (error) {
      throw error;
    } finally {
      setIsUploading(false);
      // Reset progress after a short delay for better UX
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  return {
    uploadImage,
    isUploading,
    uploadProgress,
  };
}

