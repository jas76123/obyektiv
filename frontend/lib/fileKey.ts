/** ASCII-имя файла заглушки по id: кириллица не зависит от кодировок хостинга. */
export function fileKey(id: string): string {
  return [...id]
    .map((ch) => (/[A-Za-z0-9_-]/.test(ch) ? ch : 'u' + ch.codePointAt(0)!.toString(16)))
    .join('');
}
