// EAI Schema Toolkit - Frontend JavaScript with Collaboration Features
class EAISchemaApp {
  constructor() {
    this.apiUrl = localStorage.getItem("apiUrl") || "http://localhost:3001";
    this.socket = null;
    this.currentMappingId = null;
    this.currentUsername = "Anonymous";
    this.collaborators = [];
    this.gridData = [];
    this.gridColumns = 0;
    this.gridRows = 0;
    this.selectedCell = null;
    this.mappingRules = [];
    this.currentMappingRuleId = 0;
    this.uploadQueue = []; // 업로드 큐
    this.uploadProgress = new Map(); // 업로드 진행률 추적
    this.retryAttempts = new Map(); // 재시도 횟수 추적
    this.maxRetries = 3; // 최대 재시도 횟수
    this.eventListeners = []; // 이벤트 리스너 추적을 위한 배열
    this.selectedFileId = null; // 선택된 파일 ID
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupTabs();
    this.setupDropZone();
    this.loadFiles();
    this.initializeCollaboration();
    this.loadGridData();
    this.updateLoadToGridButton(); // 그리드 로드 버튼 상태 초기화
    this.showToast("애플리케이션이 시작되었습니다.", "success");
  }

  setupEventListeners() {
    console.log("Setting up event listeners...");

    // Tab switching
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", (e) => this.switchTab(e.target.dataset.tab));
    });

    // File upload
    const fileInput = document.getElementById("fileInput");
    const uploadBtn = document.getElementById("uploadBtn");

    console.log("fileInput element:", fileInput);
    console.log("uploadBtn element:", uploadBtn);

    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        console.log("fileInput change event triggered:", e);
        this.handleFileSelect(e);
      });
      console.log("fileInput change event listener added");
    } else {
      console.error("fileInput element not found!");
    }

    if (uploadBtn) {
      uploadBtn.addEventListener("click", () => {
        console.log("uploadBtn clicked");
        this.uploadFile();
      });
      console.log("uploadBtn click event listener added");
    } else {
      console.error("uploadBtn element not found!");
    }

    // Data Grid
    document.getElementById("addRowBtn").addEventListener("click", () => this.addGridRow());
    document.getElementById("addColumnBtn").addEventListener("click", () => this.addGridColumn());
    document.getElementById("clearGridBtn").addEventListener("click", () => this.clearGrid());
    document.getElementById("exportGridBtn").addEventListener("click", () => this.exportGrid());
    document.getElementById("importGridBtn").addEventListener("click", () => this.importGrid());

    // Mapping Grid
    document.getElementById("addMappingRuleBtn").addEventListener("click", () => this.addMappingRule());
    document.getElementById("clearMappingRulesBtn").addEventListener("click", () => this.clearMappingRules());
    // URL fetch
    document.getElementById("urlInput").addEventListener("input", (e) => this.validateUrl(e.target.value));
    document.getElementById("fetchBtn").addEventListener("click", () => this.fetchFromUrl());

    // Message mapping
    document.getElementById("generateMappingBtn").addEventListener("click", () => this.generateMapping());
    document.getElementById("validateMappingBtn").addEventListener("click", () => this.validateMapping());
    document.getElementById("clearMappingBtn").addEventListener("click", () => this.clearMapping());
    // Clone tab message mapping
    document.getElementById("cloneMessageType").addEventListener("change", (e) => {
      this.updateCloneDataTypeFromConfig();
    });
    document.getElementById("cloneGenerateMappingBtn").addEventListener("click", () => this.generateCloneMapping());
    document.getElementById("cloneValidateMappingBtn").addEventListener("click", () => this.validateCloneMapping());
    document.getElementById("cloneClearMappingBtn").addEventListener("click", () => this.clearCloneMapping());
    document.getElementById("cloneAddMappingRuleBtn").addEventListener("click", () => this.addCloneMappingRule());
    document.getElementById("cloneClearMappingRulesBtn").addEventListener("click", () => this.clearCloneMappingRules());
    // Data Grid
    document.getElementById("addRowBtn").addEventListener("click", () => this.addGridRow());
    document.getElementById("addColumnBtn").addEventListener("click", () => this.addGridColumn());
    document.getElementById("clearGridBtn").addEventListener("click", () => this.clearGrid());
    document.getElementById("exportGridBtn").addEventListener("click", () => this.exportGrid());
    document.getElementById("importGridBtn").addEventListener("click", () => this.importGrid());

    // Actions
    document.getElementById("downloadBtn").addEventListener("click", () => this.downloadFile());
    document.getElementById("deleteBtn").addEventListener("click", () => this.deleteFile());
    document.getElementById("newUploadBtn").addEventListener("click", () => this.resetUpload());
    document.getElementById("refreshFilesBtn").addEventListener("click", () => this.loadFiles());

    // Collaboration features
    document.getElementById("joinCollaborationBtn").addEventListener("click", () => this.joinCollaboration());
    document.getElementById("leaveCollaborationBtn").addEventListener("click", () => this.leaveCollaboration());
    document.getElementById("usernameInput").addEventListener("input", (e) => this.updateUsername(e.target.value));

    // Settings
    document.getElementById("settingsBtn").addEventListener("click", () => this.openSettings());
    document.getElementById("closeSettingsModal").addEventListener("click", () => this.closeSettings());
    document.getElementById("cancelSettings").addEventListener("click", () => this.closeSettings());
    document.getElementById("saveSettings").addEventListener("click", () => this.saveSettings());

    // Grid integration
    document.getElementById("loadToGridBtn").addEventListener("click", () => this.loadSelectedFileToGrid());
    document.getElementById("exportFromGridBtn").addEventListener("click", () => this.exportGridToFile('csv'));

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

  initializeCollaboration() {
    // Initialize Socket.IO connection
    const socketUrl = this.apiUrl.replace("http://", "ws://").replace("https://", "wss://");
    this.socket = io(socketUrl, {
      transports: ["websocket"]
    });

    // Socket event handlers
    this.socket.on("connect", () => {
      console.log("Connected to collaboration server");
      this.updateCollaborationStatus("connected");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from collaboration server");
      this.updateCollaborationStatus("disconnected");
    });

    this.socket.on("userJoined", (data) => {
      this.addCollaborator(data);
      this.showToast(`${data.username} 님이 협업에 참여했습니다.`, "info");
    });

    this.socket.on("userLeft", (data) => {
      this.removeCollaborator(data.userId);
      this.showToast(`${data.username} 님이 협업에서 나갔습니다.`, "info");
    });

    this.socket.on("userDisconnected", (data) => {
      this.removeCollaborator(data.userId);
      this.showToast(`${data.username} 님의 연결이 끊어졌습니다.`, "warning");
    });

    this.socket.on("collaborationEvent", (event) => {
      this.handleCollaborationEvent(event);
    });

    this.socket.on("mappingEvents", (events) => {
      this.handleMappingEvents(events);
    });

    this.socket.on("userList", (users) => {
      this.updateUserList(users);
    });
  }

  joinCollaboration() {
    if (!this.currentMappingId) {
      this.showToast("매핑을 먼저 생성해주세요.", "error");
      return;
    }

    if (!this.socket) {
      this.showToast("협업 서버에 연결할 수 없습니다.", "error");
      return;
    }

    this.socket.emit("joinMapping", {
      mappingId: this.currentMappingId,
      username: this.currentUsername
    });

    this.showToast("협업 세션에 참여했습니다.", "success");
    document.getElementById("collaborationStatus").textContent = "참여 중";
    document.getElementById("collaborationStatus").className = "collaboration-status active";
  }

  leaveCollaboration() {
    if (!this.currentMappingId || !this.socket) {
      return;
    }

    this.socket.emit("leaveMapping", {
      mappingId: this.currentMappingId
    });

    this.collaborators = [];
    this.updateCollaboratorList();
    this.showToast("협업 세션에서 나갔습니다.", "info");
    document.getElementById("collaborationStatus").textContent = "미참여";
    document.getElementById("collaborationStatus").className = "collaboration-status";
  }

  updateUsername(username) {
    this.currentUsername = username || "Anonymous";
  }

  addCollaborator(data) {
    // Check if collaborator already exists
    const existingIndex = this.collaborators.findIndex(c => c.userId === data.userId);
    if (existingIndex >= 0) {
      this.collaborators[existingIndex] = data;
    } else {
      this.collaborators.push(data);
    }
    this.updateCollaboratorList();
  }

  removeCollaborator(userId) {
    this.collaborators = this.collaborators.filter(c => c.userId !== userId);
    this.updateCollaboratorList();
  }

  updateCollaboratorList() {
    const container = document.getElementById("collaboratorList");
    if (!container) return;

    container.innerHTML = this.collaborators.map(collaborator => `
      <div class="collaborator-item">
        <span class="collaborator-name">${collaborator.username}</span>
        <span class="collaborator-time">${new Date(collaborator.timestamp).toLocaleTimeString()}</span>
      </div>
    `).join("");
  }

  handleCollaborationEvent(event) {
    // Handle different types of collaboration events
    switch (event.type) {
      case "fieldUpdate":
        this.handleFieldUpdate(event);
        break;
      case "mappingUpdate":
        this.handleMappingUpdate(event);
        break;
      default:
        console.log("Unhandled collaboration event:", event);
    }
  }

  handleFieldUpdate(event) {
    // Update a field in the UI based on collaboration event
    const { fieldId, value } = event.data;
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = value;
      this.showToast(`${event.username}님이 ${fieldId} 필드를 업데이트했습니다.`, "info");
    }
  }

  handleMappingUpdate(event) {
    // Update mapping results based on collaboration event
    this.showToast(`${event.username}님이 매핑을 업데이트했습니다.`, "info");
    // In a real implementation, you would update the mapping results here
  }

  handleMappingEvents(events) {
    // Handle batch of mapping events (when joining a session)
    events.forEach(event => {
      this.handleCollaborationEvent(event);
    });
  }

  updateUserList(users) {
    this.collaborators = users;
    this.updateCollaboratorList();
  }

  updateCollaborationStatus(status) {
    const statusElement = document.getElementById("collaborationStatus");
    if (statusElement) {
      statusElement.textContent = status === "connected" ? "연결됨" : "연결 끊김";
      statusElement.className = `collaboration-status ${status === "connected" ? "connected" : "disconnected"}`;
    }
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
    console.log("Setting up drop zone...");
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");

    console.log("dropZone element:", dropZone);
    console.log("fileInput element:", fileInput);

    if (!dropZone) {
      console.error("dropZone element not found!");
      return;
    }

    if (!fileInput) {
      console.error("fileInput element not found!");
      return;
    }

    // Note: Click handling is now done via label element in HTML
    // No need for programmatic click() call

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
    document.querySelectorAll(".tab-button").forEach((btn) => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));

    // Add active class to selected tab and content
    document.querySelector(`[data-tab="${tabId}"]`).classList.add("active");
    document.getElementById(tabId).classList.add("active");

    // Reset forms
    this.resetForms();
  }

  handleFileSelect(event) {
    console.log("handleFileSelect called with event:", event);
    const files = Array.from(event.target.files);
    console.log("Files selected:", files.length, "files");

    if (files.length === 0) {
      console.log("No files selected");
      return;
    }

    const uploadBtn = document.getElementById("uploadBtn");
    const validTypes = [".xml", ".json", ".yaml", ".yml", ".csv"];
    let validFiles = [];
    let invalidFiles = [];

    // 각 파일 검증
    files.forEach(file => {
      // 파일 크기 검증 (50MB 제한)
      if (file.size > 50 * 1024 * 1024) {
        invalidFiles.push(`${file.name}: 크기가 50MB를 초과합니다.`);
        return;
      }

      // 파일 타입 검증
      const fileExtension = "." + file.name.split(".").pop().toLowerCase();
      if (!validTypes.includes(fileExtension)) {
        invalidFiles.push(`${file.name}: 지원되지 않는 파일 형식입니다.`);
        return;
      }

      validFiles.push(file);
    });

    // 유효하지 않은 파일이 있는 경우 경고 표시
    if (invalidFiles.length > 0) {
      this.showToast(`일부 파일이 검증에 실패했습니다:\n${invalidFiles.join('\n')}`, "warning");
    }

    // 유효한 파일이 있는 경우 업로드 큐에 추가
    if (validFiles.length > 0) {
      this.addFilesToQueue(validFiles);
      uploadBtn.disabled = false;

      if (validFiles.length === 1) {
        this.showToast(`파일 선택됨: ${validFiles[0].name}`, "success");
      } else {
        this.showToast(`${validFiles.length}개 파일이 선택되었습니다.`, "success");
      }
    } else {
      uploadBtn.disabled = true;
      this.showToast("유효한 파일이 없습니다.", "error");
    }
  }

  async uploadFile() {
    if (this.uploadQueue.length === 0) {
      this.showToast("업로드할 파일이 없습니다.", "error");
      return;
    }

    // 업로드 옵션 확인
    const useAdvancedUpload = document.getElementById("advancedUpload").checked;
    const enableValidation = document.getElementById("enableValidation").checked;
    const enableProcessing = document.getElementById("enableProcessing").checked;

    this.showLoading();
    this.showUploadProgress();

    try {
      if (this.uploadQueue.length === 1) {
        // 단일 파일 업로드
        await this.uploadSingleFile(this.uploadQueue[0], {
          useAdvanced: useAdvancedUpload,
          enableValidation,
          enableProcessing
        });
      } else {
        // 다중 파일 업로드
        await this.uploadMultipleFiles({
          useAdvanced: useAdvancedUpload,
          enableValidation,
          enableProcessing
        });
      }

      // 업로드 완료 후 큐 비우기
      this.uploadQueue = [];
      this.updateUploadQueueDisplay();

    } catch (error) {
      console.error("Upload error:", error);
      this.showToast("업로드 중 오류가 발생했습니다.", "error");
    } finally {
      this.hideLoading();
      this.hideUploadProgress();
    }
  }

  async uploadSingleFile(file, options = {}) {
    const uploadUrl = options.useAdvanced ? "/api/upload/file/advanced" : "/api/upload/file";

    const formData = new FormData();
    formData.append("file", file);

    if (options.useAdvanced) {
      formData.append("enableAdvancedValidation", options.enableValidation.toString());
      formData.append("enableProcessing", options.enableProcessing.toString());
      formData.append("chunkSize", "1048576"); // 1MB 청크
      formData.append("compressionEnabled", "false");
    }

    // 진행률 추적을 위한 XMLHttpRequest 사용
    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          this.updateUploadProgress(file.name, percentComplete);
        }
      });

      xhr.addEventListener("load", async () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
              this.currentFileId = data.data.fileId;
              this.showResults(data.data);
              this.loadFiles();
              this.showToast("파일이 성공적으로 업로드되었습니다.", "success");
              resolve(data);
            } else {
              this.showToast(data.message || "업로드에 실패했습니다.", "error");
              reject(new Error(data.message));
            }
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("네트워크 오류가 발생했습니다."));
      });

      xhr.open("POST", `${this.apiUrl}${uploadUrl}`);
      xhr.send(formData);
    });
  }

  async uploadMultipleFiles(options = {}) {
    const files = this.uploadQueue.map(item => item.file);
    const formData = new FormData();

    files.forEach((file, index) => {
      formData.append("files", file);
    });

    formData.append("enableAdvancedValidation", options.enableValidation.toString());
    formData.append("enableProcessing", options.enableProcessing.toString());
    formData.append("maxConcurrent", "3");

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          this.updateUploadProgress("다중 파일", percentComplete);
        }
      });

      xhr.addEventListener("load", async () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
              this.showBatchResults(data.data);
              this.loadFiles();
              this.showToast(`${data.data.summary.successful}개 파일이 업로드되었습니다.`, "success");
              resolve(data);
            } else {
              this.showToast(data.message || "업로드에 실패했습니다.", "error");
              reject(new Error(data.message));
            }
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("네트워크 오류가 발생했습니다."));
      });

      xhr.open("POST", `${this.apiUrl}/api/upload/files`);
      xhr.send(formData);
    });
  }

  validateUrl(url) {
    const fetchBtn = document.getElementById("fetchBtn");
    const urlPattern = /^https?:\/\/.+\\..+/;

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
      const validateResponse = await fetch(`${this.apiUrl}/api/upload/validate-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const validateData = await validateResponse.json();

      if (!validateData.success) {
        this.showToast(validateData.message || "URL이 유효하지 않습니다.", "error");
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
        this.showToast(data.message || "URL에서 가져오기에 실패했습니다.", "error");
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
      const response = await fetch(`${this.apiUrl}/api/upload/file/${this.currentFileId}/content`);

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
      const response = await fetch(`${this.apiUrl}/api/upload/file/${this.currentFileId}`, {
        method: "DELETE",
      });

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
        filesContainer.innerHTML = data.data.map((file) => this.createFileItem(file)).join("");
      } else {
        filesContainer.innerHTML = '<p class="no-files">업로드된 파일이 없습니다.</p>';
      }
    } catch (error) {
      console.error("Load files error:", error);
      document.getElementById("filesContainer").innerHTML = '<p class="no-files">파일 목록을 불러올 수 없습니다.</p>';
    }
  }

  selectFile(fileId) {
    // 선택 상태 토글
    if (this.selectedFileId === fileId) {
      this.selectedFileId = null;
      this.showToast("파일 선택이 해제되었습니다.", "info");
    } else {
      this.selectedFileId = fileId;
      this.showToast("파일이 선택되었습니다.", "success");
    }

    // 파일 목록 다시 로드하여 선택 상태 업데이트
    this.loadFiles();

    // 그리드 로드 버튼 활성화/비활성화
    this.updateLoadToGridButton();
  }

  updateLoadToGridButton() {
    const loadToGridBtn = document.getElementById("loadToGridBtn");
    if (loadToGridBtn) {
      loadToGridBtn.disabled = !this.selectedFileId;
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

    const isSelected = this.selectedFileId === file.fileId;
    const selectedClass = isSelected ? "selected" : "";
    const selectedText = isSelected ? " (선택됨)" : "";

    return `
            <div class="file-item ${selectedClass}" onclick="app.selectFile('${file.fileId}')">
                <div class="file-item-info">
                    <h4>${file.originalName}${selectedText}</h4>
                    <div class="file-item-meta">
                        크기: ${formatFileSize(file.size)} |
                        타입: ${file.mimetype} |
                        업로드: ${formatDate(file.uploadedAt)}
                    </div>
                </div>
                <div class="file-item-actions">
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); app.downloadFileById('${file.fileId}')">
                        <i class="fas fa-download"></i> 다운로드
                    </button>
                    <button class="btn btn-danger" onclick="event.stopPropagation(); app.deleteFileById('${file.fileId}')">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </div>
            </div>
        `;
  }

  async downloadFileById(fileId) {
    try {
      const response = await fetch(`${this.apiUrl}/api/upload/file/${fileId}/content`);

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
        // 삭제된 파일이 선택된 파일이면 선택 해제
        if (this.selectedFileId === fileId) {
          this.selectedFileId = null;
          this.updateLoadToGridButton();
        }
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
    const modal = document.getElementById("settingsModal");
    modal.style.display = "flex";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-labelledby", "settingsModalTitle");
    modal.setAttribute("aria-describedby", "settingsModalDescription");

    // 포커스 트랩 설정
    this.focusableElements = modal.querySelectorAll('button, input, select, textarea');
    this.firstFocusableElement = this.focusableElements[0];
    this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1];

    // 키보드 내비게이션 이벤트 추가
    this.handleModalKeydown = (e) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === this.firstFocusableElement) {
            e.preventDefault();
            this.lastFocusableElement.focus();
          }
        } else {
          if (document.activeElement === this.lastFocusableElement) {
            e.preventDefault();
            this.firstFocusableElement.focus();
          }
        }
      }
    };

    modal.addEventListener("keydown", this.handleModalKeydown);

    // 첫 번째 포커스 가능한 요소에 포커스
    this.firstFocusableElement.focus();
  }

  closeSettings() {
    const modal = document.getElementById("settingsModal");
    modal.style.display = "none";
    modal.removeAttribute("role");
    modal.removeAttribute("aria-labelledby");
    modal.removeAttribute("aria-describedby");

    // 키보드 이벤트 제거
    if (this.handleModalKeydown) {
      modal.removeEventListener("keydown", this.handleModalKeydown);
      this.handleModalKeydown = null;
    }
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

      const response = await fetch(`${this.apiUrl}/api/message-mapping/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ configuration, source }),
      });

      const data = await response.json();

      if (response.ok) {
        this.currentMappingId = data.id;
        this.showEnhancedMappingResult(data);

        // Generate mapping rules for the grid
        if (data.mappings && data.mappings.mappingRules) {
          this.mappingRules = data.mappings.mappingRules.map((rule, index) => ({
            id: ++this.currentMappingRuleId,
            sourceField: rule.sourceField || rule.source || "",
            targetField: rule.targetField || rule.target || "",
            mappingType: rule.mappingType || "direct",
            transformation: rule.transformation || "",
            description: rule.description || ""
          }));
          this.updateMappingGridDisplay();
        } else {
          // Fallback: generate rules from source data
          this.generateMappingRulesFromSource(source);
        }

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

    const mappingResultSection = document.getElementById("mappingResultSection");
    if (mappingResultSection) {
      mappingResultSection.style.display = "none";
    }

    // Leave collaboration if active
    this.leaveCollaboration();

    this.showToast("매핑이 클리어되었습니다.", "info");
  }

  updateMetadataTable(metadata) {
    document.getElementById("meta-messageType").textContent = metadata.messageType;
    document.getElementById("meta-dataType").textContent = metadata.dataType;
    document.getElementById("meta-rootElement").textContent = metadata.rootElement;
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

    // Enable collaboration features
    document.getElementById("collaborationSection").style.display = "block";
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
      const activeTab = document.querySelector(".result-tab-btn.active").dataset.tab;
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
      const activeTab = document.querySelector(".result-tab-btn.active").dataset.tab;
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
        document.querySelectorAll(".result-tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".result-panel").forEach((p) => p.classList.remove("active"));

        // Add active class to clicked tab and corresponding panel
        e.target.classList.add("active");
        document.getElementById(`${targetTab}-result`).classList.add("active");
      });
    });
  }

  setupResultActions(mappingId, xmlOutput) {
    // Download XML
    document.getElementById("downloadXmlResultBtn").addEventListener("click", () => {
      this.downloadXml(xmlOutput);
    });

    // Copy XML
    document.getElementById("copyXmlResultBtn").addEventListener("click", () => {
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
      const response = await fetch(`${this.apiUrl}/api/message-mapping/${mappingId}`);

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
      const response = await fetch(`${this.apiUrl}/api/message-mapping/${mappingId}`);

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

  // Data Grid Methods
  addGridRow() {
    if (this.gridColumns === 0) {
      this.addGridColumn(); // Ensure at least one column exists
    }

    const newRow = new Array(this.gridColumns).fill("");
    this.gridData.push(newRow);
    this.gridRows++;
    this.updateGridDisplay();
    this.updateGridInfo();
    this.showToast("행이 추가되었습니다.", "success");
  }

  addGridColumn() {
    if (this.gridRows === 0) {
      this.gridData.push([]);
      this.gridRows = 1;
    }

    this.gridData.forEach(row => row.push(""));
    this.gridColumns++;
    this.updateGridDisplay();
    this.updateGridInfo();
    this.showToast("열이 추가되었습니다.", "success");
  }

  clearGrid() {
    if (!confirm("정말로 모든 데이터를 삭제하시겠습니까?")) {
      return;
    }

    this.gridData = [];
    this.gridRows = 0;
    this.gridColumns = 0;
    this.selectedCell = null;
    this.updateGridDisplay();
    this.updateGridInfo();
    this.showToast("그리드가 초기화되었습니다.", "info");
  }

  updateGridDisplay() {
    const gridContainer = document.getElementById("dataGrid");

    if (this.gridRows === 0 || this.gridColumns === 0) {
      gridContainer.innerHTML = `
        <div class="grid-placeholder">
          <i class="fas fa-table"></i>
          <p>데이터 그리드가 비어 있습니다</p>
          <small>행 추가 버튼을 클릭하여 시작하세요</small>
        </div>
      `;
      return;
    }

    let html = '<table class="grid-table"><thead><tr>';

    // Column headers
    for (let col = 0; col < this.gridColumns; col++) {
      html += `<th class="col-header">${String.fromCharCode(65 + col)}</th>`;
    }
    html += '</tr></thead><tbody>';

    // Data rows
    for (let row = 0; row < this.gridRows; row++) {
      html += `<tr><td class="row-header">${row + 1}</td>`;
      for (let col = 0; col < this.gridColumns; col++) {
        const value = this.gridData[row][col] || "";
        const cellId = `cell-${row}-${col}`;
        const selectedClass = this.selectedCell === cellId ? "selected" : "";
        html += `<td class="grid-cell ${selectedClass}" id="${cellId}" contenteditable="true" data-row="${row}" data-col="${col}">${value}</td>`;
      }
      html += '</tr>';
    }

    html += '</tbody></table>';
    gridContainer.innerHTML = html;

    // Add event listeners to cells
    this.attachCellEventListeners();
  }

  attachCellEventListeners() {
    const cells = document.querySelectorAll(".grid-cell");
    cells.forEach(cell => {
      cell.addEventListener("click", (e) => this.selectCell(e.target));
      cell.addEventListener("input", (e) => this.updateCellValue(e.target));
      cell.addEventListener("keydown", (e) => this.handleCellKeydown(e));
    });
  }

  selectCell(cell) {
    // Remove previous selection
    if (this.selectedCell) {
      const prevCell = document.getElementById(this.selectedCell);
      if (prevCell) prevCell.classList.remove("selected");
    }

    // Set new selection
    this.selectedCell = cell.id;
    cell.classList.add("selected");
    cell.focus();
  }

  updateCellValue(cell) {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    this.gridData[row][col] = cell.textContent;

    // Auto-save if enabled
    if (document.getElementById("autoSave").checked) {
      this.saveGridData();
    }
  }

  handleCellKeydown(e) {
    const cell = e.target;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    switch (e.key) {
      case "Enter":
        e.preventDefault();
        // Move to next row
        const nextRow = row + 1;
        if (nextRow < this.gridRows) {
          const nextCell = document.getElementById(`cell-${nextRow}-${col}`);
          if (nextCell) this.selectCell(nextCell);
        }
        break;
      case "Tab":
        e.preventDefault();
        // Move to next column
        const nextCol = col + 1;
        if (nextCol < this.gridColumns) {
          const nextCell = document.getElementById(`cell-${row}-${nextCol}`);
          if (nextCell) this.selectCell(nextCell);
        }
        break;
      case "ArrowUp":
        if (row > 0) {
          const upCell = document.getElementById(`cell-${row - 1}-${col}`);
          if (upCell) this.selectCell(upCell);
        }
        break;
      case "ArrowDown":
        if (row < this.gridRows - 1) {
          const downCell = document.getElementById(`cell-${row + 1}-${col}`);
          if (downCell) this.selectCell(downCell);
        }
        break;
      case "ArrowLeft":
        if (col > 0) {
          const leftCell = document.getElementById(`cell-${row}-${col - 1}`);
          if (leftCell) this.selectCell(leftCell);
        }
        break;
      case "ArrowRight":
        if (col < this.gridColumns - 1) {
          const rightCell = document.getElementById(`cell-${row}-${col + 1}`);
          if (rightCell) this.selectCell(rightCell);
        }
        break;
    }
  }

  updateGridInfo() {
    const infoElement = document.getElementById("gridInfo");
    infoElement.textContent = `행: ${this.gridRows}, 열: ${this.gridColumns}`;
  }

  exportGrid() {
    if (this.gridRows === 0 || this.gridColumns === 0) {
      this.showToast("내보낼 데이터가 없습니다.", "warning");
      return;
    }

    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `data-grid-${Date.now()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast("데이터가 CSV 파일로 내보내졌습니다.", "success");
    }
  }

  importGrid() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls";

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        this.processImportFile(file);
      }
    };

    input.click();
  }

  processImportFile(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target.result;
      if (file.name.endsWith(".csv")) {
        this.importFromCSV(content);
      } else {
        this.showToast("지원되지 않는 파일 형식입니다.", "error");
      }
    };

    reader.readAsText(file);
  }

  importFromCSV(csvContent) {
    const lines = csvContent.split("\n");
    const data = [];

    lines.forEach((line, index) => {
      if (line.trim()) {
        const values = line.split(",").map(val => val.trim());
        data.push(values);
      }
    });

    if (data.length > 0) {
      this.gridData = data;
      this.gridRows = data.length;
      this.gridColumns = Math.max(...data.map(row => row.length));
      this.updateGridDisplay();
      this.updateGridInfo();
      this.showToast("데이터가 성공적으로 가져와졌습니다.", "success");
    }
  }

  generateCSV() {
    let csv = "";

    // Add headers
    for (let col = 0; col < this.gridColumns; col++) {
      csv += `${String.fromCharCode(65 + col)},`;
    }
    csv = csv.slice(0, -1) + "\n";

    // Add data
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridColumns; col++) {
        const value = this.gridData[row][col] || "";
        csv += `"${value.replace(/"/g, '""')}",`;
      }
      csv = csv.slice(0, -1) + "\n";
    }

    return csv;
  }

  saveGridData() {
    const gridData = {
      data: this.gridData,
      rows: this.gridRows,
      columns: this.gridColumns,
      timestamp: Date.now()
    };

    localStorage.setItem("eaiGridData", JSON.stringify(gridData));
  }

  loadGridData() {
    const savedData = localStorage.getItem("eaiGridData");
    if (savedData) {
      try {
        const gridData = JSON.parse(savedData);
        this.gridData = gridData.data || [];
        this.gridRows = gridData.rows || 0;
        this.gridColumns = gridData.columns || 0;
        this.updateGridDisplay();
        this.updateGridInfo();
      } catch (error) {
        console.error("Failed to load grid data:", error);
      }
    }
  }

  // Mapping Grid Methods
  addMappingRule() {
    const newRule = {
      id: ++this.currentMappingRuleId,
      sourceField: "",
      targetField: "",
      mappingType: "direct",
      transformation: "",
      description: ""
    };

    this.mappingRules.push(newRule);
    this.updateMappingGridDisplay();
    this.showToast("매핑 규칙이 추가되었습니다.", "success");
  }

  clearMappingRules() {
    if (!confirm("정말로 모든 매핑 규칙을 삭제하시겠습니까?")) {
      return;
    }

    this.mappingRules = [];
    this.currentMappingRuleId = 0;
    this.updateMappingGridDisplay();
    this.showToast("모든 매핑 규칙이 삭제되었습니다.", "info");
  }

  deleteMappingRule(ruleId) {
    this.mappingRules = this.mappingRules.filter(rule => rule.id !== ruleId);
    this.updateMappingGridDisplay();
    this.showToast("매핑 규칙이 삭제되었습니다.", "info");
  }

  updateMappingRule(ruleId, field, value) {
    const rule = this.mappingRules.find(r => r.id === ruleId);
    if (rule) {
      rule[field] = value;
    }
  }

  updateMappingGridDisplay() {
    const mappingGrid = document.getElementById("mappingGrid");

    if (this.mappingRules.length === 0) {
      mappingGrid.innerHTML = `
        <div class="mapping-placeholder">
          <i class="fas fa-project-diagram"></i>
          <p>매핑 규칙이 생성되지 않았습니다</p>
          <small>Generate 버튼을 클릭하거나 수동으로 규칙을 추가하세요</small>
        </div>
      `;
      return;
    }

    let html = '<table class="mapping-table"><thead><tr>';
    html += '<th>소스 필드</th>';
    html += '<th>대상 필드</th>';
    html += '<th>매핑 타입</th>';
    html += '<th>변환</th>';
    html += '<th>설명</th>';
    html += '<th>작업</th>';
    html += '</tr></thead><tbody>';

    this.mappingRules.forEach((rule, index) => {
      html += `<tr class="mapping-rule-row">`;
      html += `<td><input type="text" class="mapping-cell source-cell" data-rule-id="${rule.id}" data-field="sourceField" value="${rule.sourceField}" placeholder="소스 필드명"></td>`;
      html += `<td><input type="text" class="mapping-cell target-cell" data-rule-id="${rule.id}" data-field="targetField" value="${rule.targetField}" placeholder="대상 필드명"></td>`;
      html += `<td>
        <select class="mapping-cell" data-rule-id="${rule.id}" data-field="mappingType">
          <option value="direct" ${rule.mappingType === 'direct' ? 'selected' : ''}>직접 매핑</option>
          <option value="transform" ${rule.mappingType === 'transform' ? 'selected' : ''}>변환</option>
          <option value="lookup" ${rule.mappingType === 'lookup' ? 'selected' : ''}>룩업</option>
          <option value="concat" ${rule.mappingType === 'concat' ? 'selected' : ''}>병합</option>
        </select>
      </td>`;
      html += `<td><input type="text" class="mapping-cell" data-rule-id="${rule.id}" data-field="transformation" value="${rule.transformation}" placeholder="변환 규칙"></td>`;
      html += `<td><input type="text" class="mapping-cell" data-rule-id="${rule.id}" data-field="description" value="${rule.description}" placeholder="설명"></td>`;
      html += `<td class="mapping-actions">
        <button class="mapping-action-btn delete" onclick="app.deleteMappingRule(${rule.id})">
          <i class="fas fa-trash"></i>
        </button>
      </td>`;
      html += '</tr>';
    });

    html += '</tbody></table>';
    mappingGrid.innerHTML = html;

    // Add event listeners to mapping cells
    this.attachMappingCellEventListeners();
  }

  attachMappingCellEventListeners() {
    const mappingCells = document.querySelectorAll(".mapping-cell");
    mappingCells.forEach(cell => {
      cell.addEventListener("input", (e) => {
        const ruleId = parseInt(e.target.dataset.ruleId);
        const field = e.target.dataset.field;
        const value = e.target.value;
        this.updateMappingRule(ruleId, field, value);
      });
    });
  }

  // Generate mapping rules from source data
  generateMappingRulesFromSource(sourceData) {
    try {
      let parsedData;
      if (typeof sourceData === 'string') {
        parsedData = JSON.parse(sourceData);
      } else {
        parsedData = sourceData;
      }

      const rules = this.extractMappingRules(parsedData);
      this.mappingRules = rules.map((rule, index) => ({
        id: ++this.currentMappingRuleId,
        sourceField: rule.source,
        targetField: rule.target,
        mappingType: "direct",
        transformation: "",
        description: rule.description || ""
      }));

      this.updateMappingGridDisplay();
      this.showToast(`${rules.length}개의 매핑 규칙이 생성되었습니다.`, "success");
    } catch (error) {
      console.error("Failed to generate mapping rules:", error);
      this.showToast("매핑 규칙 생성에 실패했습니다.", "error");
    }
  }

  extractMappingRules(data, prefix = "") {
    const rules = [];

    if (Array.isArray(data) && data.length > 0) {
      // Handle array of objects
      const firstItem = data[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        Object.keys(firstItem).forEach(key => {
          rules.push({
            source: prefix ? `${prefix}.${key}` : key,
            target: this.toCamelCase(key),
            description: `Array item field: ${key}`
          });
        });
      }
    } else if (typeof data === 'object' && data !== null) {
      // Handle object
      Object.keys(data).forEach(key => {
        const value = data[key];
        const currentPath = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && value !== null) {
          // Nested object or array
          rules.push(...this.extractMappingRules(value, currentPath));
        } else {
          // Primitive value
          rules.push({
            source: currentPath,
            target: this.toCamelCase(key),
            description: `Field: ${key}`
          });
        }
      });
    }

    return rules;
  }

  toCamelCase(str) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }

  getMappingRules() {
    return this.mappingRules;
  }

  exportMappingRules() {
    if (this.mappingRules.length === 0) {
      this.showToast("내보낼 매핑 규칙이 없습니다.", "warning");
      return;
    }

    const mappingData = {
      rules: this.mappingRules,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };

    const blob = new Blob([JSON.stringify(mappingData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mapping-rules-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("매핑 규칙이 JSON 파일로 내보내졌습니다.", "success");
  }

  importMappingRules() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (data.rules && Array.isArray(data.rules)) {
              this.mappingRules = data.rules.map((rule, index) => ({
                ...rule,
                id: ++this.currentMappingRuleId
              }));
              this.updateMappingGridDisplay();
              this.showToast(`${data.rules.length}개의 매핑 규칙이 가져와졌습니다.`, "success");
            } else {
              this.showToast("유효하지 않은 매핑 규칙 파일입니다.", "error");
            }
          } catch (error) {
            console.error("Failed to import mapping rules:", error);
            this.showToast("매핑 규칙 파일을 읽을 수 없습니다.", "error");
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  }

  // 업로드 큐 관리 메서드들
  addFilesToQueue(files) {
    files.forEach(file => {
      this.uploadQueue.push({
        file,
        id: Date.now() + Math.random(),
        status: 'pending',
        progress: 0
      });
    });
    this.updateUploadQueueDisplay();
  }

  updateUploadQueueDisplay() {
    const queueContainer = document.getElementById("uploadQueue");
    if (!queueContainer) return;

    if (this.uploadQueue.length === 0) {
      queueContainer.innerHTML = '<p class="no-queue">업로드 대기열이 비어 있습니다.</p>';
      return;
    }

    const queueHtml = this.uploadQueue.map(item => `
      <div class="queue-item ${item.status}" data-id="${item.id}">
        <div class="queue-item-info">
          <span class="queue-item-name">${item.file.name}</span>
          <span class="queue-item-size">(${this.formatFileSize(item.file.size)})</span>
        </div>
        <div class="queue-item-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${item.progress}%"></div>
          </div>
          <span class="progress-text">${item.progress}%</span>
        </div>
        <div class="queue-item-status">${this.getStatusText(item.status)}</div>
      </div>
    `).join("");

    queueContainer.innerHTML = queueHtml;
  }

  updateUploadProgress(filename, progress) {
    // 큐에서 해당 파일 찾기
    const queueItem = this.uploadQueue.find(item => item.file.name === filename);
    if (queueItem) {
      queueItem.progress = progress;
      this.updateUploadQueueDisplay();
    }

    // 진행률 표시 업데이트
    const progressContainer = document.getElementById("uploadProgressContainer");
    const progressBar = document.getElementById("uploadProgressBar");
    const progressText = document.getElementById("uploadProgressText");

    if (progressContainer && progressBar && progressText) {
      progressContainer.style.display = "block";
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${filename}: ${progress}% 완료`;
    }
  }

  showUploadProgress() {
    const progressContainer = document.getElementById("uploadProgressContainer");
    if (progressContainer) {
      progressContainer.style.display = "block";
    }
  }

  hideUploadProgress() {
    const progressContainer = document.getElementById("uploadProgressContainer");
    if (progressContainer) {
      progressContainer.style.display = "none";
    }
  }

  showBatchResults(data) {
    const resultsSection = document.getElementById("batchResultsSection");
    const successfulList = document.getElementById("successfulUploads");
    const failedList = document.getElementById("failedUploads");

    if (!resultsSection || !successfulList || !failedList) return;

    // 성공한 파일들 표시
    if (data.successful && data.successful.length > 0) {
      successfulList.innerHTML = data.successful.map(file => `
        <div class="result-item success">
          <i class="fas fa-check-circle"></i>
          <span>${file.originalName}</span>
          <small>${this.formatFileSize(file.size)}</small>
        </div>
      `).join("");
    }

    // 실패한 파일들 표시
    if (data.failed && data.failed.length > 0) {
      failedList.innerHTML = data.failed.map(failure => `
        <div class="result-item error">
          <i class="fas fa-exclamation-circle"></i>
          <span>${failure.originalName}</span>
          <small>${failure.error}</small>
        </div>
      `).join("");
    }

    resultsSection.style.display = "block";
  }

  getStatusText(status) {
    const statusMap = {
      'pending': '대기 중',
      'uploading': '업로드 중',
      'completed': '완료',
      'failed': '실패',
      'retrying': '재시도 중'
    };
    return statusMap[status] || status;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // 재시도 로직
  async retryUpload(fileId, maxRetries = this.maxRetries) {
    const queueItem = this.uploadQueue.find(item => item.id === fileId);
    if (!queueItem) return;

    const currentRetries = this.retryAttempts.get(fileId) || 0;

    if (currentRetries >= maxRetries) {
      queueItem.status = 'failed';
      this.showToast(`${queueItem.file.name} 업로드가 ${maxRetries}회 재시도 후 실패했습니다.`, "error");
      return;
    }

    this.retryAttempts.set(fileId, currentRetries + 1);
    queueItem.status = 'retrying';
    this.updateUploadQueueDisplay();

    // 지수 백오프 (1초, 2초, 4초...)
    const delay = Math.pow(2, currentRetries) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.uploadSingleFile(queueItem.file, {
        useAdvanced: document.getElementById("advancedUpload").checked,
        enableValidation: document.getElementById("enableValidation").checked,
        enableProcessing: document.getElementById("enableProcessing").checked
      });

      queueItem.status = 'completed';
      this.retryAttempts.delete(fileId);
    } catch (error) {
      if (currentRetries + 1 >= maxRetries) {
        queueItem.status = 'failed';
        this.showToast(`${queueItem.file.name} 업로드가 최종 실패했습니다.`, "error");
      } else {
        // 재시도 계속
        this.retryUpload(fileId, maxRetries);
      }
    }

    this.updateUploadQueueDisplay();
  }

  // 그리드 연동 기능
  async loadSelectedFileToGrid() {
    if (!this.selectedFileId) {
      this.showToast("그리드에 로드할 파일을 선택하세요.", "warning");
      return;
    }

    await this.loadFileToGrid(this.selectedFileId);
  }

  async loadFileToGrid(fileId) {
    try {
      const response = await fetch(`${this.apiUrl}/api/upload/file/${fileId}/content`);
      if (!response.ok) {
        throw new Error('파일을 불러올 수 없습니다.');
      }

      const content = await response.text();
      const fileInfo = await this.getFileInfo(fileId);

      if (fileInfo.mimetype.includes('csv') || fileInfo.originalName.endsWith('.csv')) {
        this.importFromCSV(content);
        this.showToast("CSV 파일이 그리드에 로드되었습니다.", "success");
      } else if (fileInfo.mimetype.includes('json') || fileInfo.originalName.endsWith('.json')) {
        const jsonData = JSON.parse(content);
        this.importFromJSON(jsonData);
        this.showToast("JSON 파일이 그리드에 로드되었습니다.", "success");
      } else {
        this.showToast("지원되지 않는 파일 형식입니다.", "warning");
      }
    } catch (error) {
      console.error("그리드 로드 오류:", error);
      this.showToast("파일을 그리드에 로드할 수 없습니다.", "error");
    }
  }

  importFromJSON(jsonData) {
    if (Array.isArray(jsonData)) {
      // 배열인 경우
      if (jsonData.length > 0) {
        const headers = Object.keys(jsonData[0]);
        this.gridColumns = headers.length;
        this.gridRows = jsonData.length;

        this.gridData = jsonData.map(row =>
          headers.map(header => row[header] || "")
        );
      }
    } else if (typeof jsonData === 'object') {
      // 객체인 경우
      const entries = Object.entries(jsonData);
      this.gridColumns = 2;
      this.gridRows = entries.length;

      this.gridData = entries.map(([key, value]) => [key, String(value)]);
    }

    this.updateGridDisplay();
    this.updateGridInfo();
  }

  async exportGridToFile(format = 'csv') {
    if (this.gridRows === 0 || this.gridColumns === 0) {
      this.showToast("내보낼 데이터가 없습니다.", "warning");
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'csv':
        content = this.generateCSV();
        filename = `grid-export-${Date.now()}.csv`;
        mimeType = 'text/csv';
        break;
      case 'json':
        content = JSON.stringify(this.gridData, null, 2);
        filename = `grid-export-${Date.now()}.json`;
        mimeType = 'application/json';
        break;
      default:
        this.showToast("지원되지 않는 형식입니다.", "error");
        return;
    }

    // 파일로 저장
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

  async getFileInfo(fileId) {
    const response = await fetch(`${this.apiUrl}/api/upload/file/${fileId}`);
    if (!response.ok) {
      throw new Error('파일 정보를 가져올 수 없습니다.');
    }
    const data = await response.json();
    return data.data;
  }
  }

  // Clone tab methods
  updateCloneDataTypeFromConfig() {
    const messageType = document.getElementById("cloneMessageType").value;
    const dataTypeInput = document.getElementById("cloneDataTypeInput");
    dataTypeInput.value = messageType.toLowerCase();
  }

  async generateCloneMapping() {
    const messageType = document.getElementById("cloneMessageType").value;
    const dataType = document.getElementById("cloneDataType").value;
    const rootElement = document.getElementById("cloneRootElement").value;
    const namespace = document.getElementById("cloneNamespace").value;
    const encoding = document.getElementById("cloneEncoding").value;
    const version = document.getElementById("cloneVersion").value;
    const source = document.getElementById("cloneSourceInput").value;
    const statement = document.getElementById("cloneStatementInput").value;
    const testData = document.getElementById("cloneTestDataInput").value;

    if (!source) {
      this.showToast("소스 데이터를 입력하세요.", "error");
      return;
    }

    this.updateCloneDataTypeFromConfig();

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

      const response = await fetch(`${this.apiUrl}/api/message-mapping/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ configuration, source }),
      });

      const data = await response.json();

      if (response.ok) {
        this.showCloneMappingResult(data);
        this.showToast("클론 매핑이 생성되었습니다.", "success");
      } else {
        this.showToast(data.error || "매핑 생성에 실패했습니다.", "error");
      }
    } catch (error) {
      console.error("Generate clone mapping error:", error);
      this.showToast("서버 연결에 실패했습니다.", "error");
    } finally {
      this.hideLoading();
    }
  }

  async validateCloneMapping() {
    const source = document.getElementById("cloneSourceInput").value;
    const messageType = document.getElementById("cloneMessageType").value;

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
          isValid = source.includes("<") && source.includes(">");
          if (!isValid) {
            errorMessage = "유효하지 않은 XML 형식입니다.";
          }
          break;
        case "YAML":
          isValid = source.trim().length > 0;
          break;
        default:
          errorMessage = "지원되지 않는 메시지 타입입니다.";
      }

      if (isValid) {
        this.showToast("클론 데이터 검증이 성공했습니다.", "success");
      } else {
        this.showToast(errorMessage, "error");
      }
    } catch (error) {
      this.showToast("검증 중 오류가 발생했습니다.", "error");
    }
  }

  clearCloneMapping() {
    document.getElementById("cloneMessageType").value = "XML";
    document.getElementById("cloneDataType").value = "";
    document.getElementById("cloneRootElement").value = "";
    document.getElementById("cloneNamespace").value = "";
    document.getElementById("cloneEncoding").value = "UTF-8";
    document.getElementById("cloneVersion").value = "1.0";
    document.getElementById("cloneSourceInput").value = "";
    document.getElementById("cloneStatementInput").value = "";
    document.getElementById("cloneTestDataInput").value = "";
    document.getElementById("cloneDataTypeInput").value = "";

    const resultSection = document.getElementById("cloneResultSection");
    if (resultSection) {
      resultSection.style.display = "none";
    }

    this.showToast("클론 매핑이 클리어되었습니다.", "info");
  }

  addCloneMappingRule() {
    this.showToast("클론 매핑 규칙 추가 기능이 준비 중입니다.", "info");
  }

  clearCloneMappingRules() {
    this.showToast("클론 매핑 규칙이 클리어되었습니다.", "info");
  }

  showCloneMappingResult(mapping) {
    const resultSection = document.getElementById("cloneResultSection");

    const xmlOutput = this.generateXmlOutput(mapping);
    const jsonOutput = JSON.stringify(mapping, null, 2);
    const mappingOutput = JSON.stringify(mapping.mappings, null, 2);

    resultSection.style.display = "block";

    document.getElementById("cloneXmlOutput").textContent = xmlOutput;
    document.getElementById("cloneJsonOutput").textContent = jsonOutput;
    document.getElementById("cloneMappingOutput").textContent = mappingOutput;

    this.setupCloneResultActions(mapping.id, xmlOutput, jsonOutput, mappingOutput);
  }

  setupCloneResultActions(mappingId, xmlOutput, jsonOutput, mappingOutput) {
    document.getElementById("cloneDownloadResultBtn").onclick = () => {
      const activeTab = document.querySelector("#cloneResultSection .result-tab-btn.active").dataset.tab;
      let content, filename, mimeType;

      switch (activeTab) {
        case "xml":
          content = xmlOutput;
          filename = `clone-mapping-result-${mappingId}.xml`;
          mimeType = "application/xml";
          break;
        case "json":
          content = jsonOutput;
          filename = `clone-mapping-result-${mappingId}.json`;
          mimeType = "application/json";
          break;
        case "mapping":
          content = mappingOutput;
          filename = `clone-mapping-rules-${mappingId}.json`;
          mimeType = "application/json";
          break;
        default:
          content = xmlOutput;
          filename = `clone-mapping-result-${mappingId}.xml`;
          mimeType = "application/xml";
      }

      this.downloadContent(content, filename, mimeType);
    };

    document.getElementById("cloneCopyResultBtn").onclick = () => {
      const activeTab = document.querySelector("#cloneResultSection .result-tab-btn.active").dataset.tab;
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
      this.showToast("클론 결과가 클립보드에 복사되었습니다.", "success");
    };

    document.getElementById("cloneShareResultBtn").onclick = () => {
      if (navigator.share) {
        navigator.share({
          title: "EAI Schema Toolkit Clone Result",
          text: "Generated clone mapping result",
          url: window.location.href,
        });
      } else {
        this.showToast("공유 기능이 지원되지 않습니다.", "warning");
      }
    };
  }
}
}
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