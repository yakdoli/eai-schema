/**
 * 그리드 고급 기능 UI 컴포넌트
 * 필터 패널, 정렬 UI, 키보드 단축키 도움말 등을 제공
 */

import { GridComponent } from './GridComponent';
import { FilterCondition, SortCondition, DataType } from '../types/grid';
import { Logger } from '../core/logging/Logger';

export class GridAdvancedUI {
  private gridComponent: GridComponent;
  private logger: Logger;
  private filterPanel: HTMLElement | null = null;
  private shortcutsHelp: HTMLElement | null = null;

  constructor(gridComponent: GridComponent) {
    this.gridComponent = gridComponent;
    this.logger = new Logger('GridAdvancedUI');
    this.initializeUI();
  }

  /**
   * UI 초기화
   */
  private initializeUI(): void {
    this.createFilterPanel();
    this.createShortcutsHelp();
    this.setupEventListeners();
  }

  /**
   * 필터 패널 생성
   */
  private createFilterPanel(): void {
    this.filterPanel = document.createElement('div');
    this.filterPanel.className = 'filter-panel';
    this.filterPanel.style.display = 'none';
    
    this.filterPanel.innerHTML = `
      <h4>필터 설정</h4>
      <select class="filter-type-select" id="filterType">
        <option value="equals">같음</option>
        <option value="contains">포함</option>
        <option value="startsWith">시작</option>
        <option value="endsWith">끝</option>
        <option value="greaterThan">보다 큼</option>
        <option value="lessThan">보다 작음</option>
        <option value="between">범위</option>
        <option value="empty">비어있음</option>
        <option value="notEmpty">비어있지 않음</option>
      </select>
      <input type="text" class="filter-value-input" id="filterValue" placeholder="필터 값">
      <input type="text" class="filter-value-input" id="filterValue2" placeholder="최대값 (범위용)" style="display: none;">
      <div class="filter-actions">
        <button class="filter-button" id="clearFilter">지우기</button>
        <button class="filter-button primary" id="applyFilter">적용</button>
      </div>
    `;

    document.body.appendChild(this.filterPanel);
  }

  /**
   * 키보드 단축키 도움말 생성
   */
  private createShortcutsHelp(): void {
    this.shortcutsHelp = document.createElement('div');
    this.shortcutsHelp.className = 'keyboard-shortcuts-help';
    this.shortcutsHelp.style.display = 'none';
    
    this.shortcutsHelp.innerHTML = `
      <h3>키보드 단축키</h3>
      <ul class="keyboard-shortcuts-list">
        <li>
          <span>전체 선택</span>
          <span class="keyboard-shortcut-key">Ctrl + A</span>
        </li>
        <li>
          <span>복사</span>
          <span class="keyboard-shortcut-key">Ctrl + C</span>
        </li>
        <li>
          <span>붙여넣기</span>
          <span class="keyboard-shortcut-key">Ctrl + V</span>
        </li>
        <li>
          <span>포맷 포함 복사</span>
          <span class="keyboard-shortcut-key">Ctrl + Shift + C</span>
        </li>
        <li>
          <span>포맷 포함 붙여넣기</span>
          <span class="keyboard-shortcut-key">Ctrl + Shift + V</span>
        </li>
        <li>
          <span>선택 영역 삭제</span>
          <span class="keyboard-shortcut-key">Delete</span>
        </li>
        <li>
          <span>실행 취소</span>
          <span class="keyboard-shortcut-key">Ctrl + Z</span>
        </li>
        <li>
          <span>다시 실행</span>
          <span class="keyboard-shortcut-key">Ctrl + Y</span>
        </li>
        <li>
          <span>찾기</span>
          <span class="keyboard-shortcut-key">Ctrl + F</span>
        </li>
        <li>
          <span>도움말</span>
          <span class="keyboard-shortcut-key">F1</span>
        </li>
      </ul>
      <div class="filter-actions" style="margin-top: 16px;">
        <button class="filter-button primary" id="closeShortcuts">닫기</button>
      </div>
    `;

    document.body.appendChild(this.shortcutsHelp);
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    // 필터 패널 이벤트
    if (this.filterPanel) {
      const filterTypeSelect = this.filterPanel.querySelector('#filterType') as HTMLSelectElement;
      const filterValue = this.filterPanel.querySelector('#filterValue') as HTMLInputElement;
      const filterValue2 = this.filterPanel.querySelector('#filterValue2') as HTMLInputElement;
      const applyButton = this.filterPanel.querySelector('#applyFilter') as HTMLButtonElement;
      const clearButton = this.filterPanel.querySelector('#clearFilter') as HTMLButtonElement;

      // 필터 타입 변경 시 UI 업데이트
      filterTypeSelect.addEventListener('change', () => {
        const isBetween = filterTypeSelect.value === 'between';
        filterValue2.style.display = isBetween ? 'block' : 'none';
        
        const isEmpty = filterTypeSelect.value === 'empty' || filterTypeSelect.value === 'notEmpty';
        filterValue.style.display = isEmpty ? 'none' : 'block';
      });

      // 필터 적용
      applyButton.addEventListener('click', () => {
        this.applyCurrentFilter();
      });

      // 필터 지우기
      clearButton.addEventListener('click', () => {
        this.clearCurrentFilter();
      });

      // Enter 키로 필터 적용
      filterValue.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.applyCurrentFilter();
        }
      });

      filterValue2.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.applyCurrentFilter();
        }
      });
    }

    // 단축키 도움말 이벤트
    if (this.shortcutsHelp) {
      const closeButton = this.shortcutsHelp.querySelector('#closeShortcuts') as HTMLButtonElement;
      closeButton.addEventListener('click', () => {
        this.hideShortcutsHelp();
      });
    }

    // 전역 키보드 이벤트
    document.addEventListener('keydown', (e) => {
      // F1: 도움말 표시
      if (e.key === 'F1') {
        e.preventDefault();
        this.showShortcutsHelp();
      }

      // Escape: 패널 닫기
      if (e.key === 'Escape') {
        this.hideFilterPanel();
        this.hideShortcutsHelp();
      }
    });

    // 클릭으로 패널 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (this.filterPanel && 
          this.filterPanel.style.display !== 'none' && 
          !this.filterPanel.contains(e.target as Node)) {
        this.hideFilterPanel();
      }
    });
  }

  /**
   * 필터 패널 표시
   */
  public showFilterPanel(column: number, x: number, y: number): void {
    if (!this.filterPanel) return;

    this.filterPanel.style.display = 'block';
    this.filterPanel.style.left = `${x}px`;
    this.filterPanel.style.top = `${y}px`;
    
    // 현재 컬럼 저장
    (this.filterPanel as any).currentColumn = column;

    // 기존 필터 값 로드
    const activeFilters = this.gridComponent.getActiveFilters();
    const existingFilter = activeFilters.find(f => f.column === column);
    
    if (existingFilter) {
      const filterTypeSelect = this.filterPanel.querySelector('#filterType') as HTMLSelectElement;
      const filterValue = this.filterPanel.querySelector('#filterValue') as HTMLInputElement;
      const filterValue2 = this.filterPanel.querySelector('#filterValue2') as HTMLInputElement;
      
      filterTypeSelect.value = existingFilter.type;
      filterValue.value = existingFilter.value || '';
      filterValue2.value = existingFilter.value2 || '';
      
      // UI 업데이트
      filterTypeSelect.dispatchEvent(new Event('change'));
    }

    this.logger.debug(`필터 패널 표시: 컬럼 ${column}`);
  }

  /**
   * 필터 패널 숨기기
   */
  public hideFilterPanel(): void {
    if (this.filterPanel) {
      this.filterPanel.style.display = 'none';
    }
  }

  /**
   * 현재 필터 적용
   */
  private applyCurrentFilter(): void {
    if (!this.filterPanel) return;

    const column = (this.filterPanel as any).currentColumn;
    if (column === undefined) return;

    const filterTypeSelect = this.filterPanel.querySelector('#filterType') as HTMLSelectElement;
    const filterValue = this.filterPanel.querySelector('#filterValue') as HTMLInputElement;
    const filterValue2 = this.filterPanel.querySelector('#filterValue2') as HTMLInputElement;

    const condition: FilterCondition = {
      column,
      type: filterTypeSelect.value as any,
      value: filterValue.value
    };

    if (filterTypeSelect.value === 'between') {
      condition.value2 = filterValue2.value;
    }

    this.gridComponent.applyFilter(condition);
    this.hideFilterPanel();
    
    this.showClipboardFeedback(`필터 적용됨: 컬럼 ${column + 1}`);
    this.logger.debug('필터 적용됨:', condition);
  }

  /**
   * 현재 필터 지우기
   */
  private clearCurrentFilter(): void {
    if (!this.filterPanel) return;

    const column = (this.filterPanel as any).currentColumn;
    if (column === undefined) return;

    this.gridComponent.removeFilter(column);
    this.hideFilterPanel();
    
    this.showClipboardFeedback(`필터 제거됨: 컬럼 ${column + 1}`);
    this.logger.debug('필터 제거됨:', column);
  }

  /**
   * 정렬 적용 (컬럼 헤더 클릭)
   */
  public applySortByColumn(column: number): void {
    const activeSorts = this.gridComponent.getActiveSorts();
    const existingSort = activeSorts.find(s => s.column === column);
    
    let direction: 'asc' | 'desc' = 'asc';
    
    if (existingSort) {
      // 기존 정렬이 있으면 방향 토글
      direction = existingSort.direction === 'asc' ? 'desc' : 'asc';
    }

    const condition: SortCondition = {
      column,
      direction
    };

    this.gridComponent.applySort(condition);
    this.showClipboardFeedback(`정렬 적용됨: 컬럼 ${column + 1} (${direction === 'asc' ? '오름차순' : '내림차순'})`);
    this.logger.debug('정렬 적용됨:', condition);
  }

  /**
   * 키보드 단축키 도움말 표시
   */
  public showShortcutsHelp(): void {
    if (this.shortcutsHelp) {
      this.shortcutsHelp.style.display = 'block';
    }
  }

  /**
   * 키보드 단축키 도움말 숨기기
   */
  public hideShortcutsHelp(): void {
    if (this.shortcutsHelp) {
      this.shortcutsHelp.style.display = 'none';
    }
  }

  /**
   * 클립보드 피드백 표시
   */
  public showClipboardFeedback(message: string, duration: number = 2000): void {
    // 기존 피드백 제거
    const existingFeedback = document.querySelector('.clipboard-feedback');
    if (existingFeedback) {
      existingFeedback.remove();
    }

    // 새 피드백 생성
    const feedback = document.createElement('div');
    feedback.className = 'clipboard-feedback';
    feedback.textContent = message;
    
    document.body.appendChild(feedback);
    
    // 애니메이션 표시
    setTimeout(() => {
      feedback.classList.add('show');
    }, 10);

    // 자동 제거
    setTimeout(() => {
      feedback.classList.remove('show');
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 300);
    }, duration);
  }

  /**
   * 고급 컨텍스트 메뉴 생성
   */
  public createAdvancedContextMenu(x: number, y: number, row: number, col: number): HTMLElement {
    // 기존 메뉴 제거
    const existingMenu = document.querySelector('.advanced-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'advanced-context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const selectedRange = this.gridComponent.getSelectedRange();
    const hasSelection = selectedRange !== null;

    menu.innerHTML = `
      <div class="advanced-context-menu-item" data-action="copy">복사</div>
      <div class="advanced-context-menu-item" data-action="copyWithFormat">포맷 포함 복사</div>
      <div class="advanced-context-menu-item" data-action="paste">붙여넣기</div>
      <div class="advanced-context-menu-item" data-action="pasteWithFormat">포맷 포함 붙여넣기</div>
      <div class="advanced-context-menu-item" data-action="delete" ${!hasSelection ? 'disabled' : ''}>삭제</div>
      <div class="advanced-context-menu-item" data-action="insertRow">행 삽입</div>
      <div class="advanced-context-menu-item" data-action="deleteRow">행 삭제</div>
      <div class="advanced-context-menu-item" data-action="insertCol">열 삽입</div>
      <div class="advanced-context-menu-item" data-action="deleteCol">열 삭제</div>
      <div class="advanced-context-menu-item" data-action="filter">필터 설정</div>
      <div class="advanced-context-menu-item" data-action="sort">정렬</div>
      <div class="advanced-context-menu-item" data-action="freeze">고정</div>
    `;

    // 메뉴 이벤트 처리
    menu.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute('data-action');
      
      if (target.classList.contains('disabled')) {
        return;
      }

      this.handleContextMenuAction(action, row, col);
      menu.remove();
    });

    // 외부 클릭 시 메뉴 제거
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target as Node)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 10);

    document.body.appendChild(menu);
    return menu;
  }

  /**
   * 컨텍스트 메뉴 액션 처리
   */
  private handleContextMenuAction(action: string | null, row: number, col: number): void {
    switch (action) {
      case 'copy':
        // 기본 복사는 Handsontable에서 처리
        break;
      case 'copyWithFormat':
        this.gridComponent.copyWithFormat();
        this.showClipboardFeedback('포맷 포함 복사됨');
        break;
      case 'paste':
        // 기본 붙여넣기는 Handsontable에서 처리
        break;
      case 'pasteWithFormat':
        this.gridComponent.pasteWithFormat();
        this.showClipboardFeedback('포맷 포함 붙여넣기됨');
        break;
      case 'delete':
        this.gridComponent.deleteSelectedCells();
        this.showClipboardFeedback('선택 영역 삭제됨');
        break;
      case 'insertRow':
        this.gridComponent.addRow(row);
        this.showClipboardFeedback('행 삽입됨');
        break;
      case 'deleteRow':
        this.gridComponent.removeRow(row);
        this.showClipboardFeedback('행 삭제됨');
        break;
      case 'insertCol':
        this.gridComponent.addColumn(col);
        this.showClipboardFeedback('열 삽입됨');
        break;
      case 'deleteCol':
        this.gridComponent.removeColumn(col);
        this.showClipboardFeedback('열 삭제됨');
        break;
      case 'filter':
        this.showFilterPanel(col, 0, 0); // 위치는 동적으로 계산 필요
        break;
      case 'sort':
        this.applySortByColumn(col);
        break;
      case 'freeze':
        this.gridComponent.freezeColumns(col + 1);
        this.showClipboardFeedback(`${col + 1}개 열 고정됨`);
        break;
    }

    this.logger.debug('컨텍스트 메뉴 액션 실행:', { action, row, col });
  }

  /**
   * UI 정리
   */
  public destroy(): void {
    if (this.filterPanel) {
      this.filterPanel.remove();
      this.filterPanel = null;
    }

    if (this.shortcutsHelp) {
      this.shortcutsHelp.remove();
      this.shortcutsHelp = null;
    }

    // 기존 피드백 제거
    const existingFeedback = document.querySelector('.clipboard-feedback');
    if (existingFeedback) {
      existingFeedback.remove();
    }

    // 기존 메뉴 제거
    const existingMenu = document.querySelector('.advanced-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    this.logger.info('GridAdvancedUI 정리 완료');
  }
}