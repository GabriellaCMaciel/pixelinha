/** Hand a file to the browser as a download, without leaving the page. */
export function saveFile(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser a moment to start reading the file before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
