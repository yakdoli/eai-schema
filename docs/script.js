// EAI Schema Toolkit - Frontend JavaScript
class EAISchemaApp {
  constructor() {
    this.apiUrl =
      localStorage.getItem("apiUrl") ||
      "https://eai-schema-api-8128681f739e.herokuapp.com";
    this.currentFileId = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupTabs();
    this.setupDropZone();
    this.loadFiles();
    this.showToast("애플리케이션이 시작되었습니다.", "success");
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", (e) =>
        this.switchTab(e.target.dataset.tab),
      );
    });

    // File upload
    document
      .getElementById("fileInput")
      .addEventListener("change", (e) => this.handleFileSelect(e));
    document
      .getElementById("uploadBtn")
      .addEventListener("click", () => this.uploadFile());

    // URL fetch
    document
      .getElementById("urlInput")
      .addEventListener("input", (e) => this.validateUrl(e.target.value));
    document
      .getElementById("fetchBtn")
      .addEventListener("click", () => this.fetchFromUrl());

    // Message mapping
    document
      .getElementById("generateMappingBtn")
      .addEventListener("click", () => this.generateMapping());
    document
      .getElementById("validateMappingBtn")
      .addEventListener("click", () => this.validateMapping());
    document
      .getElementById("clearMappingBtn")
      .addEventListener("click", () => this.clearMapping());

    // Actions
    document
      .getElementById("downloadBtn")
      .addEventListener("click", () => this.downloadFile());
    document
      .getElementById("deleteBtn")
      .addEventListener("click", () => this.deleteFile());
    document
      .getElementById("newUploadBtn")
      .addEventListener("click", () => this.resetUpload());
    document
      .getElementById("refreshFilesBtn")
      .addEventListener("click", () => this.loadFiles());

    // Settings
    document
      .getElementById("settingsBtn")
      .addEventListener("click", () => this.openSettings());
    document
      .getElementById("closeSettingsModal")
      .addEventListener("click", () => this.closeSettings());
    document
      .getElementById("cancelSettings")
      .addEventListener("click", () => this.closeSettings());
    document
      .getElementById("saveSettings")
      .addEventListener("click", () => this.saveSettings());

    // Modal backdrop click
    document.getElementById("settingsModal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("settingsModal")) {
        this.closeSettings();
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeSettings();
      }
    });

    // Dark mode
    const toggleSwitch = document.querySelector("#checkbox");
    const currentTheme = localStorage.getItem("theme");

    if (currentTheme) {
      document.body.classList.toggle("dark-mode", currentTheme === "dark");

      if (currentTheme === "dark") {
        toggleSwitch.checked = true;
      }
    }

    toggleSwitch.addEventListener("change", (e) => {
      if (e.target.checked) {
        document.body.classList.add("dark-mode");
        localStorage.setItem("theme", "dark");
      } else {
        document.body.classList.remove("dark-mode");
        localStorage.setItem("theme", "light");
      }
    });

    // Update data type input when message type changes
    document.getElementById("messageType").addEventListener("change", (e) => {
      this.updateDataTypeFromConfig();
    });
  }

  updateDataTypeFromConfig() {
    const messageType = document.getElementById("messageType").value;
    const dataTypeInput = document.getElementById("dataTypeInput");
    dataTypeInput.value = messageType.toLowerCase();
  }

  setupTabs() {
    this.switchTab("file-upload");
  }

  setupDropZone() {
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");

    // Click to select file
    dropZone.addEventListener("click", () => fileInput.click());

    // Drag and drop events
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        this.handleFileSelect({ target: { files: files } });
      }
    });
  }

  switchTab(tabId) {
    // Remove active class from all tabs and contents
    document
      .querySelectorAll(".tab-button")
      .forEach((btn) => btn.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((content) => content.classList.remove("active"));

    // Add active class to selected tab and content
    document.querySelector(`[data-tab="${tabId}"]`).classList.add("active");
    document.getElementById(tabId).classList.add("active");

    // Reset forms
    this.resetForms();
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const uploadBtn = document.getElementById("uploadBtn");

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      this.showToast("파일 크기가 50MB를 초과합니다.", "error");
      return;
    }

    // Validate file type
    const validTypes = [".xml", ".json", ".yaml", ".yml"];
    const fileExtension = "." + file.name.split(".").pop().toLowerCase();

    if (!validTypes.includes(fileExtension)) {
      this.showToast("지원되지 않는 파일 형식입니다.", "error");
      return;
    }

    uploadBtn.disabled = false;
    this.showToast(`파일 선택됨: ${file.name}`, "success");
  }

  async uploadFile() {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (!file) {
      this.showToast("업로드할 파일을 선택하세요.", "error");
      return;
    }

    this.showLoading();

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${this.apiUrl}/api/upload/file`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        this.currentFileId = data.data.fileId;
        this.showResults(data.data);
        this.loadFiles();
        this.showToast("파일이 성공적으로 업로드되었습니다.", "success");
      } else {
        this.showToast(data.message || "업로드에 실패했습니다.", "error");
      }
    } catch (error) {
      console.error("Upload error:", error);
      this.showToast("서버 연결에 실패했습니다.", "error");
    } finally {
      this.hideLoading();
    }
  }

  validateUrl(url) {
    const fetchBtn = document.getElementById("fetchBtn");
    const urlPattern = /^https?:\/\/.+\..+/;

    fetchBtn.disabled = !url || !urlPattern.test(url);
  }

  async fetchFromUrl() {
    const urlInput = document.getElementById("urlInput");
    const url = urlInput.value.trim();

    if (!url) {
      this.showToast("URL을 입력하세요.", "error");
      return;
    }

    this.showLoading();

    try {
      // First validate the URL
      const validateResponse = await fetch(
        `${this.apiUrl}/api/upload/validate-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        },
      );

      const validateData = await validateResponse.json();

      if (!validateData.success) {
        this.showToast(
          validateData.message || "URL이 유효하지 않습니다.",
          "error",
        );
        return;
      }

      // Now fetch the schema
      const response = await fetch(`${this.apiUrl}/api/upload/url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.success) {
        this.currentFileId = data.data.fileId;
        this.showResults(data.data);
        this.loadFiles();
        this.showToast("URL에서 스키마를 성공적으로 가져왔습니다.", "success");
      } else {
        this.showToast(
          data.message || "URL에서 가져오기에 실패했습니다.",
          "error",
        );
      }
    } catch (error) {
      console.error("URL fetch error:", error);
      this.showToast("서버 연결에 실패했습니다.", "error");
    } finally {
      this.hideLoading();
    }
  }

  showLoading() {
    document.getElementById("loadingContainer").style.display = "block";
    document.getElementById("resultsSection").style.display = "none";
  }

  hideLoading() {
    document.getElementById("loadingContainer").style.display = "none";
  }

  showResults(fileData) {
    const resultsSection = document.getElementById("resultsSection");
    const fileInfoCard = document.getElementById("fileInfoCard");

    // Format file size
    const formatFileSize = (bytes) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // Format date
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString("ko-KR");
    };

    fileInfoCard.innerHTML = `
            <div class="file-info-item">
                <span class="file-info-label">파일 이름:</span>
                <span class="file-info-value">${fileData.originalName}</span>
            </div>
            <div class="file-info-item">
                <span class="file-info-label">파일 크기:</span>
                <span class="file-info-value">${formatFileSize(fileData.size)}</span>
            </div>
            <div class="file-info-item">
                <span class="file-info-label">MIME 타입:</span>
                <span class="file-info-value">${fileData.mimetype}</span>
            </div>
            <div class="file-info-item">
                <span class="file-info-label">업로드 시간:</span>
                <span class="file-info-value">${formatDate(fileData.uploadedAt)}</span>
            </div>
            <div class="file-info-item">
                <span class="file-info-label">만료 시간:</span>
                <span class="file-info-value">${formatDate(fileData.expiresAt)}</span>
            </div>
            ${
              fileData.sourceUrl
                ? `
            <div class="file-info-item">
                <span class="file-info-label">소스 URL:</span>
                <span class="file-info-value"><a href="${fileData.sourceUrl}" target="_blank">${fileData.sourceUrl}</a></span>
            </div>`
                : ""
            }
        `;

    resultsSection.style.display = "block";
  }

  async downloadFile() {
    if (!this.currentFileId) {
      this.showToast("다운로드할 파일이 없습니다.", "error");
      return;
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/api/upload/file/${this.currentFileId}/content`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          response.headers
            .get("Content-Disposition")
            ?.split("filename=")[1]
            ?.replace(/"/g, "") || "schema";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.showToast("파일이 다운로드되었습니다.", "success");
      } else {
        this.showToast("다운로드에 실패했습니다.", "error");
      }
    } catch (error) {
      console.error("Download error:", error);
      this.showToast("다운로드 중 오류가 발생했습니다.", "error");
    }
  }

  async deleteFile() {
    if (!this.currentFileId) {
      this.showToast("삭제할 파일이 없습니다.", "error");
      return;
    }

    if (!confirm("정말로 이 파일을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/api/upload/file/${this.currentFileId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (data.success) {
        this.showToast("파일이 삭제되었습니다.", "success");
        this.resetUpload();
        this.loadFiles();
      } else {
        this.showToast(data.message || "삭제에 실패했습니다.", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      this.showToast("삭제 중 오류가 발생했습니다.", "error");
    }
  }

  resetUpload() {
    this.currentFileId = null;
    document.getElementById("resultsSection").style.display = "none";
    document.getElementById("loadingContainer").style.display = "none";
    this.resetForms();
  }

  resetForms() {
    document.getElementById("fileInput").value = "";
    document.getElementById("urlInput").value = "";
    document.getElementById("uploadBtn").disabled = true;
    document.getElementById("fetchBtn").disabled = true;
  }

  async loadFiles() {
    try {
      const response = await fetch(`${this.apiUrl}/api/upload/files`);
      const data = await response.json();

      const filesContainer = document.getElementById("filesContainer");

      if (data.success && data.data.length > 0) {
        filesContainer.innerHTML = data.data
          .map((file) => this.createFileItem(file))
          .join("");
      } else {
        filesContainer.innerHTML =
          '<p class="no-files">업로드된 파일이 없습니다.</p>';
      }
    } catch (error) {
      console.error("Load files error:", error);
      document.getElementById("filesContainer").innerHTML =
        '<p class="no-files">파일 목록을 불러올 수 없습니다.</p>';
    }
  }

  createFileItem(file) {
    const formatFileSize = (bytes) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString("ko-KR");
    };

    return `
            <div class="file-item">
                <div class="file-item-info">
                    <h4>${file.originalName}</h4>
                    <div class="file-item-meta">
                        크기: ${formatFileSize(file.size)} |
                        타입: ${file.mimetype} |
                        업로드: ${formatDate(file.uploadedAt)}
                    </div>
                </div>
                <div class="file-item-actions">
                    <button class="btn btn-secondary" onclick="app.downloadFileById('${file.fileId}')">
                        <i class="fas fa-download"></i> 다운로드
                    </button>
                    <button class="btn btn-danger" onclick="app.deleteFileById('${file.fileId}')">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </div>
            </div>
        `;
  }

  async downloadFileById(fileId) {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/upload/file/${fileId}/content`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          response.headers
            .get("Content-Disposition")
            ?.split("filename=")[1]
            ?.replace(/"/g, "") || "schema";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.showToast("파일이 다운로드되었습니다.", "success");
      } else {
        this.showToast("다운로드에 실패했습니다.", "error");
      }
    } catch (error) {
      console.error("Download error:", error);
      this.showToast("다운로드 중 오류가 발생했습니다.", "error");
    }
  }

  async deleteFileById(fileId) {
    if (!confirm("정말로 이 파일을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/upload/file/${fileId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        this.showToast("파일이 삭제되었습니다.", "success");
        this.loadFiles();
      } else {
        this.showToast(data.message || "삭제에 실패했습니다.", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      this.showToast("삭제 중 오류가 발생했습니다.", "error");
    }
  }

  openSettings() {
    document.getElementById("apiUrl").value = this.apiUrl;
    document.getElementById("settingsModal").style.display = "flex";
  }

  closeSettings() {
    document.getElementById("settingsModal").style.display = "none";
  }

  saveSettings() {
    const apiUrl = document.getElementById("apiUrl").value.trim();

    if (!apiUrl) {
      this.showToast("API URL을 입력하세요.", "error");
      return;
    }

    // Remove trailing slash
    this.apiUrl = apiUrl.replace(/\/$/, "");
    localStorage.setItem("apiUrl", this.apiUrl);

    this.showToast("설정이 저장되었습니다.", "success");
    this.closeSettings();
    this.loadFiles(); // Reload files with new API URL
  }

  async generateMapping() {
    // Get all form values including new fields
    const messageType = document.getElementById("messageType").value;
    const dataType = document.getElementById("dataType").value;
    const rootElement = document.getElementById("rootElement").value;
    const namespace = document.getElementById("namespace").value;
    const encoding = document.getElementById("encoding").value;
    const version = document.getElementById("version").value;
    const source = document.getElementById("sourceInput").value;
    const statement = document.getElementById("statementInput").value;
    const testData = document.getElementById("testDataInput").value;

    if (!source) {
      this.showToast("소스 데이터를 입력하세요.", "error");
      return;
    }

    // Update data type input
    this.updateDataTypeFromConfig();

    // Update metadata table
    this.updateMetadataTable({
      messageType,
      dataType,
      rootElement,
      namespace,
      encoding,
      version,
    });

    this.showLoading();

    try {
      const configuration = {
        messageType,
        dataType,
        rootElement,
        namespace,
        encoding,
        version,
        statement,
        testData: testData ? JSON.parse(testData) : {},
      };

      const response = await fetch(
        `${this.apiUrl}/api/message-mapping/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ configuration, source }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        this.showEnhancedMappingResult(data);
        this.showToast("메시지 매핑이 생성되었습니다.", "success");
      } else {
        this.showToast(data.error || "매핑 생성에 실패했습니다.", "error");
      }
    } catch (error) {
      console.error("Generate mapping error:", error);
      this.showToast("서버 연결에 실패했습니다.", "error");
    } finally {
      this.hideLoading();
    }
  }

  async validateMapping() {
    const source = document.getElementById("sourceInput").value;
    const messageType = document.getElementById("messageType").value;

    if (!source) {
      this.showToast("검증할 소스 데이터를 입력하세요.", "error");
      return;
    }

    try {
      let isValid = false;
      let errorMessage = "";

      switch (messageType) {
        case "JSON":
          try {
            JSON.parse(source);
            isValid = true;
          } catch (e) {
            errorMessage = "유효하지 않은 JSON 형식입니다.";
          }
          break;
        case "XML":
          // Basic XML validation
          isValid = source.includes("<") && source.includes(">");
          if (!isValid) {
            errorMessage = "유효하지 않은 XML 형식입니다.";
          }
          break;
        case "YAML":
          // Basic YAML validation
          isValid = source.trim().length > 0;
          break;
        default:
          errorMessage = "지원되지 않는 메시지 타입입니다.";
      }

      if (isValid) {
        this.showToast("데이터 검증이 성공했습니다.", "success");
      } else {
        this.showToast(errorMessage, "error");
      }
    } catch (error) {
      this.showToast("검증 중 오류가 발생했습니다.", "error");
    }
  }

  clearMapping() {
    // Reset all form fields
    document.getElementById("messageType").value = "XML";
    document.getElementById("dataType").value = "";
    document.getElementById("rootElement").value = "";
    document.getElementById("namespace").value = "";
    document.getElementById("encoding").value = "UTF-8";
    document.getElementById("version").value = "1.0";
    document.getElementById("sourceInput").value = "";
    document.getElementById("statementInput").value = "";
    document.getElementById("testDataInput").value = "";
    document.getElementById("dataTypeInput").value = "";

    // Clear metadata table
    this.clearMetadataTable();

    // Hide result sections
    const resultSection = document.getElementById("resultSection");
    if (resultSection) {
      resultSection.style.display = "none";
    }

    const mappingResultSection = document.getElementById(
      "mappingResultSection",
    );
    if (mappingResultSection) {
      mappingResultSection.style.display = "none";
    }

    this.showToast("매핑이 클리어되었습니다.", "info");
  }

  updateMetadataTable(metadata) {
    document.getElementById("meta-messageType").textContent =
      metadata.messageType;
    document.getElementById("meta-dataType").textContent = metadata.dataType;
    document.getElementById("meta-rootElement").textContent =
      metadata.rootElement;
    document.getElementById("meta-namespace").textContent = metadata.namespace;
    document.getElementById("meta-encoding").textContent = metadata.encoding;
    document.getElementById("meta-version").textContent = metadata.version;
  }

  clearMetadataTable() {
    const metadataCells = [
      "meta-messageType",
      "meta-dataType",
      "meta-rootElement",
      "meta-namespace",
      "meta-encoding",
      "meta-version",
    ];
    metadataCells.forEach((id) => {
      document.getElementById(id).textContent = "-";
    });
  }

  showEnhancedMappingResult(mapping) {
    const resultSection = document.getElementById("resultSection");

    // Generate outputs
    const xmlOutput = this.generateXmlOutput(mapping);
    const jsonOutput = JSON.stringify(mapping, null, 2);
    const mappingOutput = JSON.stringify(mapping.mappings, null, 2);

    // Show result section
    resultSection.style.display = "block";

    // Update result panels
    document.getElementById("xmlOutput").textContent = xmlOutput;
    document.getElementById("jsonOutput").textContent = jsonOutput;
    document.getElementById("mappingOutput").textContent = mappingOutput;

    // Update preview content
    this.updatePreviewContent(mapping);

    // Setup result tab switching
    this.setupResultTabSwitching();

    // Setup result actions
    this.setupResultActions(mapping.id, xmlOutput, jsonOutput, mappingOutput);

    // Update mapping rules display
    this.updateMappingRules(mapping.mappings);
  }

  updatePreviewContent(mapping) {
    const previewContent = document.getElementById("previewContent");
    const config = mapping.configuration;

    previewContent.innerHTML = `
      <div class="preview-header">
        <h5>Configuration Preview</h5>
      </div>
      <div class="preview-details">
        <div class="preview-item">
          <span class="preview-label">Message Type:</span>
          <span class="preview-value">${config.messageType}</span>
        </div>
        <div class="preview-item">
          <span class="preview-label">Data Type:</span>
          <span class="preview-value">${config.dataType}</span>
        </div>
        <div class="preview-item">
          <span class="preview-label">Root Element:</span>
          <span class="preview-value">${config.rootElement || "N/A"}</span>
        </div>
        <div class="preview-item">
          <span class="preview-label">Namespace:</span>
          <span class="preview-value">${config.namespace || "N/A"}</span>
        </div>
        <div class="preview-item">
          <span class="preview-label">Processing Time:</span>
          <span class="preview-value">${mapping.metadata.processingTime}ms</span>
        </div>
        <div class="preview-item">
          <span class="preview-label">Validation:</span>
          <span class="preview-value ${mapping.metadata.validationStatus ? "valid" : "invalid"}">
            ${mapping.metadata.validationStatus ? "Valid" : "Invalid"}
          </span>
        </div>
      </div>
    `;
  }

  setupResultTabSwitching() {
    const tabButtons = document.querySelectorAll(".result-tab-btn");
    const resultPanels = document.querySelectorAll(".result-panel");

    tabButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        // Remove active class from all tabs and panels
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        resultPanels.forEach((panel) => panel.classList.remove("active"));

        // Add active class to clicked tab and corresponding panel
        e.target.classList.add("active");
        const tabId = e.target.dataset.tab;
        document.getElementById(`${tabId}Result`).classList.add("active");
      });
    });
  }

  setupResultActions(mappingId, xmlOutput, jsonOutput, mappingOutput) {
    // Download result
    document.getElementById("downloadResultBtn").onclick = () => {
      const activeTab = document.querySelector(".result-tab-btn.active").dataset
        .tab;
      let content, filename, mimeType;

      switch (activeTab) {
        case "xml":
          content = xmlOutput;
          filename = `mapping-result-${mappingId}.xml`;
          mimeType = "application/xml";
          break;
        case "json":
          content = jsonOutput;
          filename = `mapping-result-${mappingId}.json`;
          mimeType = "application/json";
          break;
        case "mapping":
          content = mappingOutput;
          filename = `mapping-rules-${mappingId}.json`;
          mimeType = "application/json";
          break;
        default:
          content = xmlOutput;
          filename = `mapping-result-${mappingId}.xml`;
          mimeType = "application/xml";
      }

      this.downloadContent(content, filename, mimeType);
    };

    // Copy result
    document.getElementById("copyResultBtn").onclick = () => {
      const activeTab = document.querySelector(".result-tab-btn.active").dataset
        .tab;
      let content;

      switch (activeTab) {
        case "xml":
          content = xmlOutput;
          break;
        case "json":
          content = jsonOutput;
          break;
        case "mapping":
          content = mappingOutput;
          break;
        default:
          content = xmlOutput;
      }

      navigator.clipboard.writeText(content);
      this.showToast("결과가 클립보드에 복사되었습니다.", "success");
    };

    // Share result
    document.getElementById("shareResultBtn").onclick = () => {
      if (navigator.share) {
        navigator.share({
          title: "EAI Schema Mapping Result",
          text: "Generated mapping result from EAI Schema Toolkit",
          url: window.location.href,
        });
      } else {
        this.showToast("공유 기능이 지원되지 않습니다.", "warning");
      }
    };
  }

  updateMappingRules(mappings) {
    const mappingRules = document.getElementById("mappingRules");
    const rules = mappings.mappingRules || [];

    if (rules.length > 0) {
      const rulesHtml = rules
        .map(
          (rule, index) => `
        <div class="mapping-rule">
          <div class="rule-header">
            <span class="rule-type">${rule.type}</span>
            <span class="rule-name">${rule.name || `Rule ${index + 1}`}</span>
          </div>
          <div class="rule-details">
            ${Object.entries(rule)
              .map(
                ([key, value]) => `
              <div class="rule-property">
                <span class="property-key">${key}:</span>
                <span class="property-value">${JSON.stringify(value)}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `,
        )
        .join("");

      mappingRules.innerHTML = rulesHtml;
    } else {
      mappingRules.innerHTML = `
        <div class="mapping-placeholder">
          <i class="fas fa-project-diagram"></i>
          <p>매핑 규칙이 생성되지 않았습니다.</p>
          <small>설정을 확인하고 다시 생성하세요.</small>
        </div>
      `;
    }
  }

  downloadContent(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    this.showToast(`${filename} 파일이 다운로드되었습니다.`, "success");
  }

  setupResultTabs() {
    const tabs = document.querySelectorAll(".result-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const targetTab = e.target.dataset.resultTab;

        // Remove active class from all tabs and panels
        document
          .querySelectorAll(".result-tab")
          .forEach((t) => t.classList.remove("active"));
        document
          .querySelectorAll(".result-panel")
          .forEach((p) => p.classList.remove("active"));

        // Add active class to clicked tab and corresponding panel
        e.target.classList.add("active");
        document.getElementById(`${targetTab}-result`).classList.add("active");
      });
    });
  }

  setupResultActions(mappingId, xmlOutput) {
    // Download XML
    document
      .getElementById("downloadXmlResultBtn")
      .addEventListener("click", () => {
        this.downloadXml(xmlOutput);
      });

    // Copy XML
    document
      .getElementById("copyXmlResultBtn")
      .addEventListener("click", () => {
        navigator.clipboard.writeText(xmlOutput);
        this.showToast("XML이 클립보드에 복사되었습니다.", "success");
      });

    // New mapping
    document.getElementById("newMappingBtn").addEventListener("click", () => {
      this.clearMapping();
    });
  }

  generateXmlOutput(mapping) {
    const config = mapping.configuration;
    const rootElement = config.rootElement || "root";
    const namespace = config.namespace ? ` xmlns="${config.namespace}"` : "";

    let xmlContent = `<?xml version="${config.version || "1.0"}" encoding="${config.encoding || "UTF-8"}"?>\n`;
    xmlContent += `<${rootElement}${namespace}>\n`;

    // Add source data as XML elements
    if (mapping.source) {
      try {
        const sourceData = JSON.parse(mapping.source);
        xmlContent += this.jsonToXml(sourceData, 1);
      } catch {
        xmlContent += `  <source>${mapping.source}</source>\n`;
      }
    }

    xmlContent += `</${rootElement}>`;

    return xmlContent;
  }

  jsonToXml(obj, indent = 0) {
    const indentStr = "  ".repeat(indent);
    let xml = "";

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        xml += `${indentStr}<item${index}>\n`;
        xml += this.jsonToXml(item, indent + 1);
        xml += `${indentStr}</item${index}>\n`;
      });
    } else if (typeof obj === "object" && obj !== null) {
      Object.keys(obj).forEach((key) => {
        xml += `${indentStr}<${key}>\n`;
        xml += this.jsonToXml(obj[key], indent + 1);
        xml += `${indentStr}</${key}>\n`;
      });
    } else {
      xml += `${indentStr}${obj}\n`;
    }

    return xml;
  }

  countXmlNodes(xmlString) {
    const matches = xmlString.match(/<[^>]+>/g);
    return matches ? matches.length : 0;
  }

  downloadXml(xmlContent) {
    const blob = new Blob([xmlContent], { type: "application/xml" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mapping-result-${Date.now()}.xml`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    this.showToast("XML 파일이 다운로드되었습니다.", "success");
  }

  async copyMapping(mappingId) {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/message-mapping/${mappingId}`,
      );
      const data = await response.json();

      if (response.ok) {
        const mappingText = JSON.stringify(data, null, 2);
        navigator.clipboard.writeText(mappingText);
        this.showToast("매핑이 클립보드에 복사되었습니다.", "success");
      } else {
        this.showToast("매핑을 가져올 수 없습니다.", "error");
      }
    } catch (error) {
      console.error("Copy mapping error:", error);
      this.showToast("복사 중 오류가 발생했습니다.", "error");
    }
  }

  async downloadMapping(mappingId) {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/message-mapping/${mappingId}`,
      );
      const data = await response.json();

      if (response.ok) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mapping-${mappingId}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.showToast("매핑이 다운로드되었습니다.", "success");
      } else {
        this.showToast("매핑을 다운로드할 수 없습니다.", "error");
      }
    } catch (error) {
      console.error("Download mapping error:", error);
      this.showToast("다운로드 중 오류가 발생했습니다.", "error");
    }
  }

  showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    const toastIcon = toast.querySelector(".toast-icon");
    const toastMessage = toast.querySelector(".toast-message");

    // Set icon based on type
    const icons = {
      success: "fas fa-check-circle",
      error: "fas fa-exclamation-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
    };

    toastIcon.className = `toast-icon ${icons[type] || icons.info}`;
    toastMessage.textContent = message;

    // Remove existing type classes and add new one
    toast.className = `toast ${type}`;

    // Show toast
    toast.classList.add("show");

    // Hide toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new EAISchemaApp();
});

// Service Worker registration for PWA capabilities (optional)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("Service Worker registered"))
      .catch(() => console.log("Service Worker registration failed"));
  });
}
