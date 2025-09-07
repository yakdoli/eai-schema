// Export Utility
export class ExportUtil {
  static exportAsFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  static exportAsWSDL(content, filename = 'service.wsdl') {
    this.exportAsFile(content, filename, 'application/wsdl+xml');
  }
  
  static exportAsXSD(content, filename = 'schema.xsd') {
    this.exportAsFile(content, filename, 'application/xml');
  }
  
  static exportAsJSON(content, filename = 'service.json') {
    this.exportAsFile(content, filename, 'application/json');
  }
  
  static exportAsSOAP(content, filename = 'soap-message.xml') {
    this.exportAsFile(content, filename, 'application/soap+xml');
  }
  
  static copyToClipboard(content) {
    return navigator.clipboard.writeText(content);
  }
}