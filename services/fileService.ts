
import { VaultFile } from '../types';

export const readFilesFromInput = (fileList: FileList): Promise<VaultFile[]> => {
  const filePromises: Promise<VaultFile>[] = [];
  const files = Array.from(fileList);

  for (const file of files) {
    // We are only interested in Markdown files for an Obsidian vault
    if (file.name.endsWith('.md')) {
      const promise = new Promise<VaultFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target && typeof event.target.result === 'string') {
            resolve({
              name: file.name,
              content: event.target.result,
            });
          } else {
            reject(new Error(`Failed to read file: ${file.name}`));
          }
        };
        reader.onerror = (error) => {
          reject(error);
        };
        reader.readAsText(file);
      });
      filePromises.push(promise);
    }
  }

  return Promise.all(filePromises);
};
