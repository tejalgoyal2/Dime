// The file is made on the server (/api/export) and arrives as a normal
// download, which works everywhere: Safari, Firefox, installed web apps, phones.
export function downloadCsv() {
  const a = document.createElement("a");
  a.href = "/api/export";
  a.download = "";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
