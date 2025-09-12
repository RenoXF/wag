/**
 * Recursively transforms Buffer or Uint8Array instances into a JSON-friendly format.
 *
 * OPTIMIZED: This version avoids creating a new Buffer if the input is already a Buffer,
 * which prevents unnecessary memory allocation and copying.
 *
 * @template T
 * @param {T} data - The data to be transformed.
 * @returns {any} The transformed data.
 */
export function transformBuffer<T>(data: T): any {
  // Langsung tangani kasus primitif atau null di awal.
  if (data === null || typeof data !== 'object') {
    return data;
  }

  // OPTIMASI: Jika sudah Buffer, langsung panggil .toString() tanpa membuat buffer baru.
  if (data instanceof Buffer) {
    return { type: 'Buffer', data: data.toString('base64') };
  }

  // Untuk Uint8Array, kita tetap perlu membuatnya menjadi Buffer terlebih dahulu.
  if (data instanceof Uint8Array) {
    return { type: 'Buffer', data: Buffer.from(data).toString('base64') };
  }

  if (Array.isArray(data)) {
    // .map adalah pendekatan fungsional yang baik dan cukup efisien.
    return data.map((item) => transformBuffer(item));
  }

  // Untuk objek biasa, kita buat objek baru (menjaga immutability).
  // typeof data === 'object' sudah dipastikan di atas.
  const newObj: { [key: string]: any } = {};
  for (const key in data) {
    if (Object.hasOwn(data, key)) {
      newObj[key] = transformBuffer((data as any)[key]);
    }
  }
  return newObj;
}

/**
 * Revives Buffer instances from the JSON-ified format.
 *
 * OPTIMIZED: The logic is restructured for clarity and slightly better performance
 * by having a clearer guard clause and object shape check. The core mechanism remains
 * in-place mutation, which is already very efficient.
 *
 * @template T
 * @param {T} data - The object or array to revive Buffer instances from.
 * @returns {T} The mutated data with Buffer instances revived.
 */
export function reviveBuffer<T>(data: T): T {
  // OPTIMASI: Guard clause yang lebih spesifik.
  // Hanya proses objek (termasuk array), selain itu kembalikan apa adanya.
  if (data === null || typeof data !== 'object') {
    return data;
  }

  // Cek apakah objek saat ini adalah representasi Buffer yang akan di-revive.
  // 'data' in data digunakan untuk performa dan keamanan sebelum mengakses properti.
  if (
    !Array.isArray(data) &&
    (data as any).type === 'Buffer' &&
    typeof (data as any).data === 'string' &&
    Object.keys(data).length === 2 // Memastikan objek hanya punya `type` dan `data`
  ) {
    return Buffer.from((data as any).data, 'base64') as any;
  }

  if (Array.isArray(data)) {
    // Mutasi in-place untuk array, ini sangat cepat.
    for (let i = 0; i < data.length; i++) {
      data[i] = reviveBuffer(data[i]);
    }
  } else {
    // Mutasi in-place untuk objek.
    for (const key in data) {
      if (Object.hasOwn(data, key)) {
        (data as any)[key] = reviveBuffer((data as any)[key]);
      }
    }
  }

  return data;
}
