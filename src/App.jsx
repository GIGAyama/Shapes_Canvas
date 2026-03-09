import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Square, Triangle, Circle, Hexagon, Ruler, Gauge,
  PenTool, Copy, Trash2, Eraser, Undo, Redo, Download,
  Check, X, Grid3X3, Image as ImageIcon,
  AlertCircle, ChevronRight, MousePointer2,
  Pencil, Link
} from 'lucide-react';

// ==========================================
// 1. UI Components (GIGA Standard UI)
// ==========================================

// ふりがな（ルビ）コンポーネント
const R = ({ children, rt }) => (
  <ruby style={{ rubyPosition: 'over', textDecoration: 'none' }}>
    {children}
    <rt className="text-[0.6em] text-slate-500 font-medium select-none tracking-tighter" style={{ transform: 'translateY(-2px)' }}>
      {rt}
    </rt>
  </ruby>
);

// カスタムボタンコンポーネント
const ToolButton = ({ onClick, icon: Icon, label, rt, variant = 'primary', className = '', active = false }) => {
  const baseStyle = "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 w-full gap-1 active:scale-95 border-2 shadow-sm";
  const variants = {
    primary: "bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300",
    success: "bg-white border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300",
    danger: "bg-white border-red-100 text-red-600 hover:bg-red-50 hover:border-red-300",
    warning: "bg-white border-amber-100 text-amber-600 hover:bg-amber-50 hover:border-amber-300",
    neutral: "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
  };
  const activeStyle = active ? "ring-2 ring-offset-1 ring-amber-400 bg-amber-50 border-amber-300 text-amber-700" : "";

  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${activeStyle} ${className}`}>
      {Icon && <Icon size={22} strokeWidth={2.5} />}
      <span className="text-xs font-bold leading-none mt-1"><R rt={rt}>{label}</R></span>
    </button>
  );
};

// カスタムモーダルコンポーネント
const Modal = ({ isOpen, title, children, onConfirm, onCancel, confirmText = "OK", cancelText = "キャンセル" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 text-indigo-900">
          <AlertCircle size={20} className="text-indigo-500" />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <div className="p-6">{children}</div>
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
          {onCancel && (
            <button onClick={onCancel} className="px-4 py-2 rounded-lg font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors">
              {cancelText}
            </button>
          )}
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors flex items-center gap-1">
            <Check size={18} /> {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 2. Main Application Component
// ==========================================
export default function MathLearningStudio() {
  // --- States ---
  const [dependenciesLoaded, setDependenciesLoaded] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentColor, setCurrentColor] = useState('#ea4335');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToAngle, setSnapToAngle] = useState(true);
  
  // Modal States
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, data: null });

  // --- Refs ---
  const canvasContainerRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const lastOffsetRef = useRef(0);
  
  // History & Logic Refs (to avoid stale closures in canvas events)
  const historyRef = useRef([]);
  const historyStepRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const isEditModeRef = useRef(false);
  const editProxyGroupRef = useRef([]);
  const originalObjHiddenRef = useRef(null);
  const snapToGridRef = useRef(true);
  const snapToAngleRef = useRef(true);

  const GRID_SIZE = 50;
  const STORAGE_KEY = 'giga-math-studio-v2';
  const MAX_HISTORY = 20;

  // Sync refs with state for event listeners
  useEffect(() => { snapToGridRef.current = snapToGrid; }, [snapToGrid]);
  useEffect(() => { snapToAngleRef.current = snapToAngle; }, [snapToAngle]);
  useEffect(() => { isEditModeRef.current = isEditMode; }, [isEditMode]);

  // --- Initialize Fabric.js & LZString ---
  useEffect(() => {
    let fabricReady = !!window.fabric;
    let lzReady = !!window.LZString;

    const checkReady = () => {
      if (fabricReady && lzReady) setDependenciesLoaded(true);
    };

    if (!fabricReady) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js';
      script.async = true;
      script.onload = () => { fabricReady = true; checkReady(); };
      document.head.appendChild(script);
    }
    
    if (!lzReady) {
      const scriptLz = document.createElement('script');
      scriptLz.src = 'https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js';
      scriptLz.async = true;
      scriptLz.onload = () => { lzReady = true; checkReady(); };
      document.head.appendChild(scriptLz);
    }
    
    checkReady();
  }, []);

  useEffect(() => {
    if (!dependenciesLoaded || !canvasContainerRef.current) return;

    // Destroy existing canvas if React StrictMode renders twice
    if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
    }

    const container = canvasContainerRef.current;
    const canvas = new window.fabric.Canvas('fabric-canvas', {
      width: container.clientWidth,
      height: container.clientHeight,
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: 'transparent'
    });
    
    // Fabric.js Global Configuration for Modern UI/UX (Touch friendly)
    window.fabric.Object.prototype.set({
      transparentCorners: false,
      cornerColor: '#ffffff',
      cornerStrokeColor: '#6366f1', // Indigo-500
      borderColor: '#6366f1',
      cornerSize: 16, // Larger for touch
      padding: 10,
      cornerStyle: 'circle',
      borderDashArray: [5, 5]
    });

    fabricCanvasRef.current = canvas;

    // 手書きペンの初期設定
    canvas.freeDrawingBrush.color = currentColor;
    canvas.freeDrawingBrush.width = 4;

    // --- Canvas Events ---
    canvas.on('object:moving', (options) => {
      if (!snapToGridRef.current) return;
      const target = options.target;
      if (target.isTool || target.isControlPoint) return;
      target.set({
        left: Math.round(target.left / GRID_SIZE) * GRID_SIZE,
        top: Math.round(target.top / GRID_SIZE) * GRID_SIZE
      });
    });

    canvas.on('object:rotating', (options) => {
      if (!snapToAngleRef.current) return;
      const target = options.target;
      if (target.isTool) return;
      const snapAngle = 15;
      const snapped = Math.round(target.angle / snapAngle) * snapAngle;
      target.rotate(snapped);
    });

    canvas.on('object:modified', (e) => {
      if (e.target && e.target.isTool) e.target.bringToFront();
      handleStateChange(e);
    });

    canvas.on('object:added', handleStateChange);
    canvas.on('object:removed', handleStateChange);
    
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => {
        if(isEditModeRef.current) exitEditMode();
    });

    canvas.on('mouse:down', (options) => {
        // 背景クリックで自動的に編集モードを終了
        if (!options.target && isEditModeRef.current) {
            exitEditMode();
        }
    });

    // Resize handler
    const handleResize = () => {
      if (!fabricCanvasRef.current || !canvasContainerRef.current) return;
      const parent = canvasContainerRef.current;
      fabricCanvasRef.current.setWidth(parent.clientWidth);
      fabricCanvasRef.current.setHeight(parent.clientHeight);
      fabricCanvasRef.current.renderAll();
    };
    window.addEventListener('resize', handleResize);

    // Initial Load (URL parameter OR LocalStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const boardData = urlParams.get('board');
    
    if (boardData && window.LZString) {
      try {
        const jsonStr = window.LZString.decompressFromEncodedURIComponent(boardData);
        if (jsonStr) {
          isUndoRedoRef.current = true;
          canvas.loadFromJSON(jsonStr, () => {
            canvas.renderAll();
            isUndoRedoRef.current = false;
            historyRef.current = [jsonStr];
            historyStepRef.current = 0;
            updateUndoRedoUI();
            // 読み込み後はURLをスッキリさせる
            window.history.replaceState({}, document.title, window.location.pathname);
          });
        } else {
          loadFromLocalStorage(canvas);
        }
      } catch (e) {
        console.error("URLデータの読み込みに失敗しました", e);
        loadFromLocalStorage(canvas);
      }
    } else {
      loadFromLocalStorage(canvas);
    }

    // Keyboard bindings
    const handleKeyDown = (e) => {
        if (modalConfig.isOpen) return;
        // Allow backspace in input fields
        if (e.target.tagName.toLowerCase() === 'input') return;

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmd = isMac ? e.metaKey : e.ctrlKey;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            const activeObj = fabricCanvasRef.current.getActiveObject();
            if (activeObj) {
                e.preventDefault();
                deleteObject();
            }
        } else if (cmd && (e.key === 'd' || e.key === 'D')) { // 複製 (Ctrl+D)
            e.preventDefault();
            copyObject();
        } else if (cmd && (e.key === 'z' || e.key === 'Z')) { // Undo/Redo
            e.preventDefault();
            if (e.shiftKey) redo(); else undo();
        } else if (cmd && (e.key === 'y' || e.key === 'Y')) { // Redo (Ctrl+Y)
            e.preventDefault();
            redo();
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown);
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependenciesLoaded]);

  // --- History System ---
  const handleStateChange = (e) => {
    if (isUndoRedoRef.current) return;
    if (e && e.target && (e.target.isControlPoint || e.target.isProxyLine)) return;
    saveHistory();
    saveToLocalStorage();
  };

  const saveHistory = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    if (historyStepRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
    }
    
    const json = JSON.stringify(canvas.toDatalessJSON(['isTool', 'id', 'isControlPoint', 'isProxyLine', 'pointIndex']));
    historyRef.current.push(json);
    
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyStepRef.current++;
    }
    updateUndoRedoUI();
  };

  const updateUndoRedoUI = () => {
    setCanUndo(historyStepRef.current > 0);
    setCanRedo(historyStepRef.current < historyRef.current.length - 1);
  };

  const undo = () => {
    if (historyStepRef.current > 0) {
      if (isEditModeRef.current) exitEditMode();
      isUndoRedoRef.current = true;
      historyStepRef.current--;
      fabricCanvasRef.current.loadFromJSON(historyRef.current[historyStepRef.current], () => {
        fabricCanvasRef.current.renderAll();
        isUndoRedoRef.current = false;
        updateUndoRedoUI();
        saveToLocalStorage();
      });
    }
  };

  const redo = () => {
    if (historyStepRef.current < historyRef.current.length - 1) {
      if (isEditModeRef.current) exitEditMode();
      isUndoRedoRef.current = true;
      historyStepRef.current++;
      fabricCanvasRef.current.loadFromJSON(historyRef.current[historyStepRef.current], () => {
        fabricCanvasRef.current.renderAll();
        isUndoRedoRef.current = false;
        updateUndoRedoUI();
        saveToLocalStorage();
      });
    }
  };

  const saveToLocalStorage = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const json = canvas.toJSON(['isTool', 'id']);
    // 不要なコントロールポイントを除外して保存
    json.objects = json.objects.filter(obj => !obj.isTool && !obj.isControlPoint && !obj.isProxyLine); 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
  };

  const loadFromLocalStorage = (canvas) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      isUndoRedoRef.current = true;
      canvas.loadFromJSON(saved, () => {
        canvas.renderAll();
        isUndoRedoRef.current = false;
        historyRef.current = [saved];
        historyStepRef.current = 0;
        updateUndoRedoUI();
      });
    } else {
      saveHistory(); // 初期状態を保存
    }
  };

  // --- Selection & Color ---
  const handleSelection = (e) => {
    const selected = e.selected[0];
    if (!selected) return;
    
    if (selected.isTool) {
      selected.bringToFront();
    } else if (selected.fill && typeof selected.fill === 'string' && !selected.isControlPoint) {
      setCurrentColor(selected.fill);
    }

    if (isEditModeRef.current) {
      if (!selected.isControlPoint && !selected.isProxyLine) {
        exitEditMode();
      }
    }
  };

  const handleColorChange = (colorValue) => {
    setCurrentColor(colorValue);
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // 手書きペンの色も更新
    canvas.freeDrawingBrush.color = colorValue;

    const activeObj = canvas.getActiveObject();
    if (activeObj && !activeObj.isTool && !activeObj.isControlPoint) {
      if (activeObj.type === 'activeSelection') {
        activeObj.forEachObject(obj => obj.set('fill', colorValue));
      } else {
        activeObj.set('fill', colorValue);
      }
      canvas.requestRenderAll();
      canvas.fire('object:modified', { target: activeObj });
    }
  };


  // --- Shape Generation ---
  const generateId = () => Date.now() + Math.floor(Math.random() * 1000);

  const getSmartPos = () => {
    lastOffsetRef.current = (lastOffsetRef.current + 20) % 100;
    return { left: 100 + lastOffsetRef.current, top: 100 + lastOffsetRef.current };
  };

  const addShape = (shapeType) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    let obj;
    const pos = getSmartPos();
    const commonProps = {
      ...pos, fill: currentColor, stroke: '#1e293b', strokeWidth: 2, opacity: 0.9, id: generateId()
    };

    switch (shapeType) {
      case 'rect':
        obj = new window.fabric.Rect({ ...commonProps, width: GRID_SIZE * 2, height: GRID_SIZE * 2 });
        break;
      case 'triangle':
        obj = new window.fabric.Triangle({ ...commonProps, width: GRID_SIZE * 2, height: GRID_SIZE * 2 });
        break;
      case 'circle':
        obj = new window.fabric.Circle({ ...commonProps, radius: GRID_SIZE });
        break;
      default: return;
    }
    
    canvas.add(obj);
    canvas.setActiveObject(obj);
    saveHistory();
  };

  const createNGon = (n) => {
    const canvas = fabricCanvasRef.current;
    const radius = GRID_SIZE * 2;
    const points = [];
    for (let i = 0; i < n; i++) {
      const angle = (i * 2 * Math.PI / n) - Math.PI / 2;
      points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
    const pos = getSmartPos();
    const poly = new window.fabric.Polygon(points, {
      ...pos, fill: currentColor, stroke: '#1e293b', strokeWidth: 2, opacity: 0.9, id: generateId()
    });
    canvas.add(poly);
    canvas.setActiveObject(poly);
    saveHistory();
    closeModal();
  };

  const createSizedShape = (type, w, h) => {
    const canvas = fabricCanvasRef.current;
    const width = w * GRID_SIZE;
    const height = h * GRID_SIZE;
    let obj;
    const pos = getSmartPos();
    
    if (type === 'rect') {
      obj = new window.fabric.Rect({ ...pos, fill: currentColor, width, height, stroke: '#1e293b', strokeWidth: 2, opacity: 0.9, id: generateId() });
    } else {
      // 直角三角形
      const points = [{x: 0, y: 0}, {x: width, y: 0}, {x: 0, y: -height}];
      obj = new window.fabric.Polygon(points, { left: pos.left, top: pos.top + height, fill: currentColor, stroke: '#1e293b', strokeWidth: 2, opacity: 0.9, id: generateId() });
    }
    
    canvas.add(obj);
    canvas.setActiveObject(obj);
    saveHistory();
    closeModal();
  };

  // --- Drawing Mode ---
  const toggleDrawingMode = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const newMode = !isDrawingMode;
    canvas.isDrawingMode = newMode;
    setIsDrawingMode(newMode);
    
    if (newMode) {
      canvas.discardActiveObject();
      if (isEditModeRef.current) exitEditMode();
      canvas.requestRenderAll();
    }
  };

  // --- URL Sharing (問題配信) ---
  const generateShareLink = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !window.LZString) return;
    
    const json = canvas.toJSON(['isTool', 'id']);
    json.objects = json.objects.filter(obj => !obj.isTool && !obj.isControlPoint && !obj.isProxyLine);
    
    const jsonStr = JSON.stringify(json);
    const compressed = window.LZString.compressToEncodedURIComponent(jsonStr);
    const shareUrl = `${window.location.origin}${window.location.pathname}?board=${compressed}`;
    
    // iFrame環境等も考慮したクリップボードコピー
    const copyToClipboard = (text) => {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        return new Promise((res, rej) => {
          document.execCommand('copy') ? res() : rej();
          textArea.remove();
        });
      }
    };

    copyToClipboard(shareUrl)
      .then(() => {
        openModal('info', { 
            title: 'リンクをコピーしました！', 
            message: <>このURLを<R rt="じどう">児童</R>のたんまつに<R rt="おく">送</R>ると、<R rt="いま">今</R>のボードの<R rt="じょうたい">状態</R>から<R rt="がくしゅう">学習</R>をスタートできます。</>
        });
      })
      .catch(() => {
        openModal('info', { 
            title: 'リンクをコピーできませんでした', 
            message: <><R rt="いか">以下</R>のURLをコピーして<R rt="きょうゆう">共有</R>してください:<br/><br/>{shareUrl}</>
        });
      });
  };

  // --- Tools (Ruler / Protractor) ---
  const addRuler = () => {
    const canvas = fabricCanvasRef.current;
    const rulerLength = 400; 
    const rulerHeight = 60;
    
    const bg = new window.fabric.Rect({
        width: rulerLength, height: rulerHeight,
        fill: 'rgba(255, 255, 255, 0.85)',
        stroke: '#94a3b8', strokeWidth: 1.5,
        rx: 8, ry: 8,
        originX: 'center', originY: 'center',
        left: 0, top: 0,
        shadow: new window.fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetY: 4 })
    });

    const ticks = [];
    for(let i=0; i<=rulerLength; i+=10) {
        const isMajor = (i % 50 === 0);
        const h = isMajor ? 24 : 12;
        const strokeW = isMajor ? 2 : 1;
        const x = i - rulerLength / 2; 
        const bottomY = rulerHeight / 2; 

        ticks.push(new window.fabric.Line([x, bottomY - h, x, bottomY], {
            stroke: '#334155', strokeWidth: strokeW,
            originX: 'center', originY: 'center'
        }));

        if (isMajor) {
            ticks.push(new window.fabric.Text((i/50).toString(), {
                left: x, top: bottomY - 32,
                fontSize: 16, fontFamily: 'sans-serif', fontWeight: 'bold',
                originX: 'center', originY: 'center', fill: '#334155'
            }));
        }
    }

    const rulerGroup = new window.fabric.Group([bg, ...ticks], {
        left: 150, top: 300,
        isTool: true,
        lockScalingY: true, lockScalingX: true, // サイズ変更不可
        transparentCorners: false,
        cornerColor: '#6366f1', cornerSize: 12, cornerStyle: 'circle',
        borderColor: '#818cf8', padding: 5
    });
    
    canvas.add(rulerGroup);
    canvas.setActiveObject(rulerGroup);
  };

  const addProtractor = () => {
    const canvas = fabricCanvasRef.current;
    const radius = 180;
    
    const semiCircle = new window.fabric.Path(`M ${-radius} 0 A ${radius} ${radius} 0 0 1 ${radius} 0`, {
        fill: 'rgba(241, 245, 249, 0.85)',
        stroke: '#94a3b8', strokeWidth: 1.5,
        originX: 'center', originY: 'bottom',
        left: 0, top: 0,
        shadow: new window.fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetY: 4 })
    });

    const marks = [];
    const bottomLine = new window.fabric.Line([-radius, 0, radius, 0], { 
        stroke: '#94a3b8', strokeWidth: 1.5,
        originX: 'center', originY: 'center', left: 0, top: 0
    });
    
    const centerMark = new window.fabric.Circle({ 
        radius: 4, fill: '#ef4444', 
        originX: 'center', originY: 'center', left: 0, top: 0
    });

    for(let i=0; i<=180; i+=10) {
        const angleRad = (i * Math.PI) / 180;
        const x1 = Math.cos(Math.PI - angleRad) * (radius - 5);
        const y1 = -Math.sin(Math.PI - angleRad) * (radius - 5);
        const x2 = Math.cos(Math.PI - angleRad) * (radius - 15);
        const y2 = -Math.sin(Math.PI - angleRad) * (radius - 15);
        
        const isMajor = (i % 30 === 0);
        
        marks.push(new window.fabric.Line([x1, y1, x2, y2], {
            stroke: '#334155', strokeWidth: isMajor ? 2 : 1,
            originX: 'center', originY: 'center'
        }));
        
        if(isMajor) {
           const tx = Math.cos(Math.PI - angleRad) * (radius - 35);
           const ty = -Math.sin(Math.PI - angleRad) * (radius - 35);
           marks.push(new window.fabric.Text(i.toString(), {
               left: tx, top: ty,
               fontSize: 14, fontFamily: 'sans-serif', fontWeight: 'bold',
               originX: 'center', originY: 'center', fill: '#334155'
           }));
        }
    }
    
    const innerArc = new window.fabric.Path(`M ${-radius+60} 0 A ${radius-60} ${radius-60} 0 0 1 ${radius-60} 0`, {
        fill: 'transparent', stroke: '#cbd5e1', strokeWidth: 1,
        originX: 'center', originY: 'bottom', left: 0, top: 0
    });

    const group = new window.fabric.Group([semiCircle, bottomLine, centerMark, innerArc, ...marks], {
        left: 200, top: 300,
        isTool: true,
        lockScalingX: true, lockScalingY: true,
        transparentCorners: false,
        cornerColor: '#6366f1', cornerSize: 12, cornerStyle: 'circle',
        borderColor: '#818cf8', padding: 5
    });
    
    canvas.add(group);
    canvas.setActiveObject(group);
  };


  // --- Vertex Editing System (Robust) ---
  const toggleEditMode = () => {
    const canvas = fabricCanvasRef.current;
    if (isEditModeRef.current) {
        exitEditMode();
        return;
    }

    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
        openModal('info', { 
            title: <><R rt="ずけい">図形</R>を<R rt="えら">選</R>んでください</>, 
            message: <><R rt="かたち">形</R>を<R rt="か">変</R>えたい<R rt="ずけい">図形</R>をクリックしてからボタンを<R rt="お">押</R>してね。</> 
        });
        return;
    }
    if (activeObj.isTool || activeObj.type === 'activeSelection') {
        openModal('info', { 
            title: 'できません', 
            message: <>このアイテムは<R rt="かたち">形</R>を<R rt="か">変</R>えられません。</> 
        });
        return;
    }
    
    if (['rect', 'triangle', 'circle'].includes(activeObj.type)) {
        openModal('confirmConvert', { obj: activeObj });
        return;
    }

    if (activeObj.type !== 'polygon') return;
    enterEditMode(activeObj);
  };

  const convertToPolygonAndEdit = (obj) => {
    const canvas = fabricCanvasRef.current;
    let points = [];
    const w = obj.width * obj.scaleX;
    const h = obj.height * obj.scaleY;
    
    if (obj.type === 'circle') {
        const r = w / 2;
        for(let i=0; i<12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }
    } else if (obj.type === 'rect') {
        points = [ {x: -w/2, y: -h/2}, {x: w/2, y: -h/2}, {x: w/2, y: h/2}, {x: -w/2, y: h/2} ];
    } else if (obj.type === 'triangle') {
        points = [ {x: 0, y: -h/2}, {x: -w/2, y: h/2}, {x: w/2, y: h/2} ];
    }

    const poly = new window.fabric.Polygon(points, {
        left: obj.left, top: obj.top, angle: obj.angle,
        fill: obj.fill, stroke: obj.stroke, strokeWidth: obj.strokeWidth,
        opacity: obj.opacity, objectCaching: false, id: obj.id || generateId()
    });

    canvas.remove(obj);
    canvas.add(poly);
    canvas.renderAll();
    closeModal();
    enterEditMode(poly);
  };

  const enterEditMode = (poly) => {
    const canvas = fabricCanvasRef.current;
    setIsEditMode(true);
    originalObjHiddenRef.current = poly;
    
    poly.visible = false;
    poly.evented = false;
    canvas.discardActiveObject();

    const matrix = poly.calcTransformMatrix();
    const absolutePoints = poly.points.map(p => {
        return window.fabric.util.transformPoint({
            x: p.x - poly.pathOffset.x,
            y: p.y - poly.pathOffset.y
        }, matrix);
    });

    editProxyGroupRef.current = [];
    
    absolutePoints.forEach((p, index) => {
        const circle = new window.fabric.Circle({
            left: p.x, top: p.y,
            radius: 12, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 3,
            originX: 'center', originY: 'center',
            hasControls: false, hasBorders: false,
            isControlPoint: true,
            pointIndex: index,
            shadow: new window.fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 4, offsetY: 2 })
        });
        canvas.add(circle);
        editProxyGroupRef.current.push(circle);

        circle.on('moving', function() {
            if (snapToGridRef.current) {
                  this.set({
                    left: Math.round(this.left / GRID_SIZE) * GRID_SIZE,
                    top: Math.round(this.top / GRID_SIZE) * GRID_SIZE
                });
            }
            updateProxyLines();
        });
    });

    updateProxyLines();
    canvas.requestRenderAll();
  };

  const updateProxyLines = () => {
    const canvas = fabricCanvasRef.current;
    const oldLines = editProxyGroupRef.current.filter(o => o.isProxyLine);
    oldLines.forEach(l => canvas.remove(l));
    
    const circles = editProxyGroupRef.current.filter(o => o.isControlPoint);
    const newGroup = [...circles]; // Keep circles

    for(let i=0; i<circles.length; i++) {
        const c1 = circles[i];
        const c2 = circles[(i+1) % circles.length];
        
        const line = new window.fabric.Line([c1.left, c1.top, c2.left, c2.top], {
            stroke: '#4f46e5', strokeWidth: 3, strokeDashArray: [6, 6],
            selectable: false, evented: false,
            isProxyLine: true
        });
        canvas.add(line);
        line.sendToBack(); 
        newGroup.push(line);
    }
    editProxyGroupRef.current = newGroup;
  };

  const exitEditMode = () => {
    if (!isEditModeRef.current) return;
    const canvas = fabricCanvasRef.current;
    const targetPoly = originalObjHiddenRef.current;
    const proxies = [...editProxyGroupRef.current];

    setIsEditMode(false);
    originalObjHiddenRef.current = null;
    editProxyGroupRef.current = [];

    proxies.forEach(o => canvas.remove(o));

    if (targetPoly) {
        const circles = proxies.filter(o => o.isControlPoint);
        circles.sort((a, b) => a.pointIndex - b.pointIndex);
        const newPoints = circles.map(c => ({ x: c.left, y: c.top }));
        
        canvas.remove(targetPoly);

        const newPoly = new window.fabric.Polygon(newPoints, {
            fill: targetPoly.fill,
            stroke: targetPoly.stroke,
            strokeWidth: targetPoly.strokeWidth,
            opacity: targetPoly.opacity,
            objectCaching: false,
            id: targetPoly.id
        });
        
        canvas.add(newPoly);
        canvas.setActiveObject(newPoly); 
        saveHistory();
    }
    canvas.requestRenderAll();
  };


  // --- Operations ---
  const copyObject = () => {
    const canvas = fabricCanvasRef.current;
    const o = canvas.getActiveObject();
    if (!o || o.isControlPoint) return;
    
    o.clone(c => {
        canvas.discardActiveObject();
        c.set({ left: o.left + 20, top: o.top + 20, evented: true, id: generateId() });
        if (c.type === 'activeSelection') {
            c.canvas = canvas;
            c.forEachObject(x => canvas.add(x));
            c.setCoords();
        } else {
            canvas.add(c);
        }
        canvas.setActiveObject(c);
        canvas.requestRenderAll();
        saveHistory();
    });
  };

  const deleteObject = () => {
    const canvas = fabricCanvasRef.current;
    if (isEditModeRef.current) {
        // 編集中に削除を押した場合、編集をキャンセルして元の図形も消す
        editProxyGroupRef.current.forEach(o => canvas.remove(o));
        if (originalObjHiddenRef.current) canvas.remove(originalObjHiddenRef.current);
        setIsEditMode(false);
        originalObjHiddenRef.current = null;
        editProxyGroupRef.current = [];
        canvas.requestRenderAll();
        saveHistory();
        return;
    }
    
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
        canvas.discardActiveObject();
        activeObjects.forEach(o => canvas.remove(o));
        canvas.requestRenderAll();
        saveHistory();
    }
  };

  const confirmClearCanvas = () => {
    openModal('confirmClear');
  };

  const clearCanvas = () => {
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.fire('object:modified');
    closeModal();
  };

  const downloadImage = () => {
    const canvas = fabricCanvasRef.current;
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    
    // Get original background (transparent)
    const url = canvas.toDataURL({ format: 'png', multiplier: 2 });
    
    const a = document.createElement('a');
    a.download = `sansuu-note-${new Date().getTime()}.png`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- Modal Helpers ---
  const openModal = (type, data = null) => setModalConfig({ isOpen: true, type, data });
  const closeModal = () => setModalConfig({ isOpen: false, type: null, data: null });

  const PRESET_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#1e293b', '#ffffff'];

  // ==========================================
  // Render
  // ==========================================
  
  if (!dependenciesLoaded) {
    return <div className="flex items-center justify-center h-screen bg-slate-50 text-indigo-600 font-bold animate-pulse">Loading Studio...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans overflow-hidden text-slate-800">
      {/* Global Styles injected for patterns and utility */}
      <style>{`
        .graph-paper-bg {
          background-color: #ffffff;
          background-image: 
            linear-gradient(#f1f5f9 2px, transparent 2px),
            linear-gradient(90deg, #f1f5f9 2px, transparent 2px);
          background-size: ${GRID_SIZE}px ${GRID_SIZE}px;
          background-position: -1px -1px;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {/* --- Navbar (Top) --- */}
      <nav className="h-16 bg-white shadow-sm border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3 text-indigo-600">
          <Grid3X3 size={28} strokeWidth={2.5} className="bg-indigo-100 p-1 rounded-lg" />
          <h1 className="text-xl font-extrabold tracking-tight">図形キャンバス</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button onClick={undo} disabled={!canUndo} className="p-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all" title="元に戻す">
              <Undo size={20} />
            </button>
            <div className="w-px bg-slate-300 my-1 mx-1"></div>
            <button onClick={redo} disabled={!canRedo} className="p-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all" title="やり直し">
              <Redo size={20} />
            </button>
          </div>
          
          <button onClick={generateShareLink} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-4 py-2 rounded-xl font-bold transition-colors shadow-sm active:scale-95">
            <Link size={20} />
            <R rt="もんだい">問題</R>を<R rt="くば">配</R>る
          </button>

          <button onClick={downloadImage} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-4 py-2 rounded-xl font-bold transition-colors shadow-sm active:scale-95">
            <ImageIcon size={20} />
            <R rt="がぞう">画像</R>に<R rt="ほぞん">保存</R>
          </button>
        </div>
      </nav>

      {/* --- Main Workspace --- */}
      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        
        {/* Sidebar (Toolbar) */}
        <aside className="w-64 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0 z-10">
          <div className="bg-indigo-600 text-white p-3 font-bold flex items-center gap-2 shadow-sm shrink-0">
            <PenTool size={20} />
            <R rt="どうぐばこ">道具箱</R>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6">
            
            {/* Shapes Section */}
            <section>
              <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2 border-b border-slate-100 pb-1">
                <Square size={16}/> <R rt="ずけい">図形</R>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <ToolButton onClick={() => addShape('rect')} icon={Square} label="四角" rt="しかく" />
                <ToolButton onClick={() => addShape('triangle')} icon={Triangle} label="三角" rt="さんかく" />
                <ToolButton onClick={() => addShape('circle')} icon={Circle} label="円" rt="えん" />
                <ToolButton onClick={() => openModal('polygon')} icon={Hexagon} label="多角形" rt="たかくけい" />
              </div>
              <button onClick={() => openModal('sizeBuilder')} className="mt-3 w-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 py-2.5 rounded-xl font-bold text-sm transition-colors active:scale-95 flex justify-center items-center gap-1 shadow-sm">
                <Grid3X3 size={18} /> <R rt="さいず">サイズ</R>で<R rt="つく">作</R>る
              </button>
            </section>

            {/* Tools Section */}
            <section>
              <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2 border-b border-slate-100 pb-1">
                <Ruler size={16}/> <R rt="じょうぎ">定規</R>ツール
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <ToolButton onClick={addRuler} icon={Ruler} label="定規" rt="じょうぎ" variant="neutral" />
                <ToolButton onClick={addProtractor} icon={Gauge} label="分度器" rt="ぶんどき" variant="neutral" />
              </div>
            </section>

            {/* Operations Section */}
            <section>
              <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2 border-b border-slate-100 pb-1">
                <MousePointer2 size={16}/> <R rt="そうさ">操作</R>
              </h3>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <ToolButton 
                    onClick={toggleDrawingMode} 
                    icon={Pencil} 
                    label="手書き" 
                    rt="てがき"
                    variant="neutral" 
                    active={isDrawingMode}
                  />
                  <ToolButton 
                    onClick={toggleEditMode} 
                    icon={isEditMode ? Check : MousePointer2} 
                    label={isEditMode ? "完了" : "形を変える"} 
                    rt={isEditMode ? "かんりょう" : "かたちをかえる"}
                    variant="warning" 
                    active={isEditMode}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <ToolButton onClick={copyObject} icon={Copy} label="複製" rt="ふくせい" variant="success" />
                   <ToolButton onClick={deleteObject} icon={Trash2} label="削除" rt="さくじょ" variant="danger" />
                </div>
              </div>
            </section>

             {/* Settings & Colors Section */}
             <section className="mt-auto pt-4 border-t border-slate-100">
              <div className="mb-4">
                <label className="text-sm font-bold text-slate-500 mb-2 block"><R rt="いろ">色</R></label>
                
                {/* プリセットカラーパレット */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_COLORS.map(c => (
                    <button 
                      key={c} 
                      onClick={() => handleColorChange(c)} 
                      className={`w-7 h-7 rounded-full border-2 shadow-sm transition-transform hover:scale-110 active:scale-95 ${currentColor === c ? 'border-indigo-500 scale-110' : 'border-slate-200'}`} 
                      style={{ backgroundColor: c }} 
                      title="色を変える"
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={currentColor} 
                    onChange={(e) => handleColorChange(e.target.value)} 
                    className="w-10 h-10 rounded-xl border-2 border-slate-200 cursor-pointer p-1 bg-white shrink-0"
                  />
                  <div className="text-[11px] text-slate-400 font-medium leading-tight">
                    <R rt="ずけい">図形</R>を<R rt="えら">選</R>んで<br/><R rt="いろ">色</R>を<R rt="か">変</R>えられます
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative">
                    <input type="checkbox" className="sr-only peer" checked={snapToGrid} onChange={e => setSnapToGrid(e.target.checked)} />
                    <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                  </div>
                  <span className="text-sm font-bold text-slate-700"><R rt="ほうがん">方眼</R>に<R rt="あ">合</R>わせる</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative">
                    <input type="checkbox" className="sr-only peer" checked={snapToAngle} onChange={e => setSnapToAngle(e.target.checked)} />
                    <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                  </div>
                  <span className="text-sm font-bold text-slate-700"><R rt="かくど">角度</R>ピタッ</span>
                </label>
              </div>

               <button onClick={confirmClearCanvas} className="mt-4 w-full py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-red-500 rounded-xl transition-colors flex justify-center items-center gap-1">
                 <Eraser size={16} /> <R rt="ぜんぶ">全部</R><R rt="け">消</R>す
               </button>
            </section>

          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
          <div ref={canvasContainerRef} className="absolute inset-0 graph-paper-bg">
            <canvas id="fabric-canvas" />
          </div>
          
          {/* Edit Mode Overlay Indicator */}
          {isEditMode && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4 pointer-events-none">
               <PenTool size={18} /> <R rt="ちょうてん">頂点</R>を<R rt="うご">動</R>かして<R rt="かたち">形</R>を<R rt="か">変</R>えられます
               <button onClick={toggleEditMode} className="ml-4 bg-white text-amber-600 px-3 py-1 rounded-full text-sm hover:bg-amber-50 pointer-events-auto"><R rt="かんりょう">完了</R></button>
             </div>
          )}
        </main>
      </div>

      {/* --- Modals --- */}
      
      {/* 1. Polygon Builder Modal */}
      <Modal 
        isOpen={modalConfig.isOpen && modalConfig.type === 'polygon'} 
        title={<><R rt="たかくけい">多角形</R>を<R rt="つく">作</R>る</>}
        onCancel={closeModal}
        onConfirm={() => {
            const val = document.getElementById('poly-range').value;
            createNGon(parseInt(val));
        }}
        confirmText={<><R rt="つく">作</R>る</>}
      >
        <div className="flex flex-col items-center gap-6">
           <Hexagon size={48} className="text-indigo-400" strokeWidth={1.5} />
           <div className="w-full">
             <label className="block text-center font-bold text-lg mb-4 text-slate-700">
               <R rt="ちょうてん">頂点</R>の<R rt="かず">数</R>: <span id="poly-val-display" className="text-indigo-600 text-2xl ml-2">6</span>
             </label>
             <input 
               type="range" id="poly-range" min="3" max="12" step="1" defaultValue="6" 
               className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
               onChange={(e) => document.getElementById('poly-val-display').textContent = e.target.value}
             />
             <div className="flex justify-between text-xs font-bold text-slate-400 mt-2 px-1">
                <span>3 (<R rt="さんかく">三角</R>)</span>
                <span>12</span>
             </div>
           </div>
        </div>
      </Modal>

      {/* 2. Size Builder Modal */}
      <Modal
        isOpen={modalConfig.isOpen && modalConfig.type === 'sizeBuilder'}
        title={<><R rt="さいず">サイズ</R>を<R rt="してい">指定</R>して<R rt="つく">作</R>る</>}
        onCancel={closeModal}
        onConfirm={() => {
            const type = document.querySelector('input[name="shapeType"]:checked').value;
            const w = document.getElementById('size-w').value;
            const h = document.getElementById('size-h').value;
            createSizedShape(type, parseInt(w), parseInt(h));
        }}
        confirmText={<><R rt="つく">作</R>る</>}
      >
         <div className="space-y-6">
            <div>
              <p className="font-bold text-slate-700 mb-3"><R rt="かたち">形</R>を<R rt="えら">選</R>ぶ</p>
              <div className="flex gap-4">
                 <label className="flex-1 cursor-pointer">
                    <input type="radio" name="shapeType" value="rect" className="peer sr-only" defaultChecked />
                    <div className="p-4 border-2 border-slate-200 rounded-xl peer-checked:border-indigo-500 peer-checked:bg-indigo-50 flex flex-col items-center gap-2 transition-all">
                       <Square size={32} className="text-indigo-500" />
                       <span className="font-bold text-slate-700"><R rt="しかくけい">四角形</R></span>
                    </div>
                 </label>
                 <label className="flex-1 cursor-pointer">
                    <input type="radio" name="shapeType" value="tri" className="peer sr-only" />
                    <div className="p-4 border-2 border-slate-200 rounded-xl peer-checked:border-indigo-500 peer-checked:bg-indigo-50 flex flex-col items-center gap-2 transition-all">
                       <Triangle size={32} className="text-indigo-500" />
                       <span className="font-bold text-slate-700"><R rt="ちょっかくさんかくけい">直角三角形</R></span>
                    </div>
                 </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
               <div>
                  <label className="block font-bold text-slate-700 mb-2"><R rt="よこ">横</R>の<R rt="なが">長</R>さ</label>
                  <div className="relative">
                    <input id="size-w" type="number" min="1" max="20" defaultValue="4" className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">cm</span>
                  </div>
               </div>
               <div>
                  <label className="block font-bold text-slate-700 mb-2"><R rt="たて">縦</R>の<R rt="なが">長</R>さ</label>
                   <div className="relative">
                    <input id="size-h" type="number" min="1" max="20" defaultValue="3" className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">cm</span>
                  </div>
               </div>
            </div>
         </div>
      </Modal>

      {/* 3. Confirm Edit Mode Conversion */}
      <Modal
         isOpen={modalConfig.isOpen && modalConfig.type === 'confirmConvert'}
         title={<><R rt="ずけい">図形</R>を<R rt="へんかん">変換</R>しますか？</>}
         onCancel={closeModal}
         onConfirm={() => convertToPolygonAndEdit(modalConfig.data.obj)}
         confirmText={<>はい</>}
      >
         <p className="text-slate-600 font-medium leading-relaxed">この<R rt="ずけい">図形</R>は<R rt="きほんてき">基本的</R>な<R rt="かたち">形</R>です。<br/><R rt="じゆう">自由</R>な<R rt="かたち">形</R>に<R rt="か">変</R>えられるように、<R rt="せんよう">専用</R>の<R rt="ずけい">図形</R>に<R rt="へんかん">変換</R>してもよろしいですか？</p>
      </Modal>

      {/* 4. Info Modal */}
      <Modal
         isOpen={modalConfig.isOpen && modalConfig.type === 'info'}
         title={modalConfig.data?.title}
         onConfirm={closeModal}
      >
         <p className="text-slate-600 font-medium whitespace-pre-line leading-relaxed">{modalConfig.data?.message}</p>
      </Modal>

      {/* 5. Confirm Clear */}
      <Modal
         isOpen={modalConfig.isOpen && modalConfig.type === 'confirmClear'}
         title={<><R rt="ぜんぶ">全部</R><R rt="け">消</R>しますか？</>}
         onCancel={closeModal}
         onConfirm={clearCanvas}
         confirmText={<>はい、<R rt="け">消</R>します</>}
      >
         <div className="flex flex-col items-center gap-4 py-4 text-red-500">
           <Trash2 size={48} strokeWidth={1.5}/>
           <p className="font-bold text-slate-700 text-lg text-center leading-relaxed">キャンバスにある<R rt="ずけい">図形</R>がすべて<R rt="き">消</R>えます。<br/><R rt="ほんとう">本当</R>によろしいですか？</p>
         </div>
      </Modal>

      {/* --- Footer --- */}
      <footer className="bg-white border-t border-slate-200 py-2.5 text-center shrink-0 z-10 text-xs text-slate-500 font-medium">
        © 2026 図形キャンバス <a href="https://note.com/cute_borage86" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">GIGA山</a>
      </footer>

    </div>
  );
}
