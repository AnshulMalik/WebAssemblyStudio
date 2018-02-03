import "minimatch";
import { Minimatch } from "minimatch";
import "monaco-editor";
import { assert } from "./index";

declare var window: any;

export function shallowCompare(a: any[], b: any[]) {
  if (a === b) { return true; }
  if (a.length !== b.length) { return false; }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) { return false; }
  }
  return true;
}

export enum FileType {
  JavaScript = "javascript",
  TypeScript = "typescript",
  HTML = "html",
  CSS = "css",
  C = "c",
  Cpp = "cpp",
  Rust = "rust",
  Wast = "wast",
  Wasm = "wasm",
  Directory = "directory",
  Log = "log",
  x86 = "x86",
  Markdown = "markdown",
  Cretonne = "cretonne",
}

export function languageForFileType(type: FileType): string {
  if (type === FileType.HTML) {
    return "html";
  } else if (type === FileType.CSS) {
    return "css";
  } else if (type === FileType.JavaScript) {
    return "javascript";
  } else if (type === FileType.TypeScript) {
    return "typescript";
  } else if (type === FileType.C || type === FileType.Cpp) {
    return "cpp";
  } else if (type === FileType.Wast || type === FileType.Wasm) {
    return "wast";
  } else if (type === FileType.Log) {
    return "log";
  } else if (type === FileType.x86) {
    return "x86";
  } else if (type === FileType.Markdown) {
    return "markdown";
  } else if (type === FileType.Cretonne) {
    return "cton";
  }
  return "";
}

export function nameForFileType(type: FileType): string {
  if (type === FileType.HTML) {
    return "HTML";
  } else if (type === FileType.CSS) {
    return "CSS";
  } else if (type === FileType.JavaScript) {
    return "JavaScript";
  } else if (type === FileType.TypeScript) {
    return "TypeScript";
  } else if (type === FileType.C) {
    return "C";
  } else if (type === FileType.Cpp) {
    return "C++";
  } else if (type === FileType.Wast) {
    return "Wast";
  } else if (type === FileType.Wasm) {
    return "Wasm";
  } else if (type === FileType.Markdown) {
    return "Markdown";
  } else if (type === FileType.Rust) {
    return "Rust";
  } else if (type === FileType.Cretonne) {
    return "Cretonne";
  }
  return "";
}

export function extensionForFileType(type: FileType): string {
  if (type === FileType.HTML) {
    return "html";
  } else if (type === FileType.CSS) {
    return "css";
  } else if (type === FileType.JavaScript) {
    return "js";
  } else if (type === FileType.TypeScript) {
    return "ts";
  } else if (type === FileType.C) {
    return "c";
  } else if (type === FileType.Cpp) {
    return "cpp";
  } else if (type === FileType.Wast) {
    return "wast";
  } else if (type === FileType.Wasm) {
    return "wasm";
  } else if (type === FileType.Markdown) {
    return "md";
  } else if (type === FileType.Rust) {
    return "rs";
  } else if (type === FileType.Cretonne) {
    return "cton";
  }
  return "";
}

export function mimeTypeForFileType(type: FileType): string {
  if (type === FileType.HTML) {
    return "text/html";
  } else if (type === FileType.JavaScript) {
    return "application/javascript";
  } else if (type === FileType.Wasm) {
    return "application/wasm";
  }
  return "";
}

export function getIconForFileType(fileType: FileType): string {
  if (fileType === FileType.JavaScript) {
    return "file_type_js";
  } else if (fileType === FileType.TypeScript) {
    return "file_type_typescript";
  } else if (fileType === FileType.C) {
    return "file_type_c";
  } else if (fileType === FileType.Cpp) {
    return "file_type_cpp";
  } else if (fileType === FileType.Directory) {
    return "default_folder";
  }
  return "default_file";
}

export class EventDispatcher {
  public readonly name: string;
  private callbacks: Function[] = [];
  constructor(name: string) {
    this.name = name;
  }
  public register(callback: Function) {
    if (this.callbacks.indexOf(callback) >= 0) {
      return;
    }
    this.callbacks.push(callback);
  }
  public unregister(callback: Function) {
    const i = this.callbacks.indexOf(callback);
    if (i < 0) {
      throw new Error("Unknown callback.");
    }
    this.callbacks.splice(i, 1);
  }
  public dispatch(target?: any) {
    // console.log("Dispatching " + this.name);
    this.callbacks.forEach((callback) => {
      callback(target);
    });
  }
}

function monacoSeverityToString(severity: monaco.Severity) {
  switch (severity) {
    case monaco.Severity.Info: return "info";
    case monaco.Severity.Warning: return "warning";
    case monaco.Severity.Error: return "error";
    case monaco.Severity.Ignore: return "ignore";
  }
}
export class Problem {
  public static fromMarker(marker: monaco.editor.IMarkerData) {
    return new Problem(
      `${marker.message} (${marker.startLineNumber}, ${marker.startColumn})`,
      monacoSeverityToString(marker.severity),
      marker);
  }

  constructor(
    public description: string,
    public severity: "error" | "warning" | "info" | "ignore",
    public marker?: monaco.editor.IMarkerData) {
  }
}

export class File {
  public name: string;
  public type: FileType;
  public data: string | ArrayBuffer;
  public parent: Directory;
  public isDirty: boolean = false;
  public isBufferReadOnly: boolean = false;
  public readonly onDidChangeData = new EventDispatcher("File Data Change");
  public readonly onDidChangeBuffer = new EventDispatcher("File Buffer Change");
  public readonly onDidChangeProblems = new EventDispatcher("File Problems Change");
  public readonly key = String(Math.random());
  public readonly buffer?: monaco.editor.IModel;
  public description: string;
  public problems: Problem[] = [];
  constructor(name: string, type: FileType) {
    this.name = name;
    this.type = type;
    this.data = null; // localStorage.getItem(this.name);
    this.buffer = monaco.editor.createModel(this.data as any, languageForFileType(type));
    this.buffer.updateOptions({ tabSize: 2, insertSpaces: true });
    this.buffer.onDidChangeContent((e) => {
      const dispatch = !this.isDirty;
      this.isDirty = true;
      if (dispatch) {
        let file: File = this;
        while (file) {
          file.onDidChangeBuffer.dispatch();
          file = file.parent;
        }
      }
      monaco.editor.setModelMarkers(this.buffer, "compiler", []);
    });
    this.isBufferReadOnly = type === FileType.Wasm;
    if (this.isBufferReadOnly) {
      this.description = "Read Only";
    }
    this.parent = null;
  }
  public setProblems(problems: Problem []) {
    this.problems = problems;
    let file: File = this;
    while (file) {
      file.onDidChangeProblems.dispatch();
      file = file.parent;
    }
  }
  public getEmitOutput(): Promise<string> {
    const model = this.buffer;
    if (this.type !== FileType.TypeScript) {
      return Promise.resolve("");
    }
    return new Promise((resolve, reject) => {
      monaco.languages.typescript.getTypeScriptWorker().then(function(worker) {
        worker(model.uri).then(function(client: any) {
          client.getEmitOutput(model.uri.toString()).then(function(r: any) {
            resolve(r);
          });
        });
      });
    });
  }
  public setData(data: string | ArrayBuffer, setBuffer = true) {
    this.data = data;
    let file: File = this;
    if (typeof data === "string") {
      if (setBuffer) {
        this.buffer.setValue(data);
      }
      this.isDirty = false;
    }
    while (file) {
      file.onDidChangeData.dispatch();
      file = file.parent;
    }
  }
  public getData(): string | ArrayBuffer {
    if (this.isDirty && !this.isBufferReadOnly) {
      const project = this.getProject();
      if (project) {
        project.onDirtyFileUsed.dispatch(this);
      }
    }
    return this.data;
  }
  public getProject(): Project {
    let parent = this.parent;
    while (parent.parent) {
      parent = parent.parent;
    }
    if (parent instanceof Project) {
      return parent;
    }
    return null;
  }
  public getDepth(): number {
    let depth = 0;
    let parent = this.parent;
    while (parent) {
      parent = parent.parent;
      depth++;
    }
    return depth;
  }
  public getPath(): string {
    const path = [];
    let parent = this.parent;
    if (!parent) {
      return "";
    }
    while (parent.parent) {
      path.unshift(parent.name);
      parent = parent.parent;
    }
    path.push(this.name);
    return path.join("/");
  }
  public save() {
    if (!this.isDirty) {
      return;
    }
    this.isDirty = false;
    this.setData(this.buffer.getValue(), false);
  }
  public toString() {
    return "File [" + this.name + "]";
  }
}

export class Directory extends File {
  public name: string;
  private children: File[] = [];
  public isOpen: boolean = true;
  public readonly onDidChangeChildren = new EventDispatcher("Directory Changed ");
  constructor(name: string) {
    super(name, FileType.Directory);
  }
  private notifyDidChangeChildren() {
    let directory: Directory = this;
    while (directory) {
      directory.onDidChangeChildren.dispatch();
      directory = directory.parent;
    }
  }
  public forEachFile(fn: (file: File) => void) {
    this.children.forEach(fn);
  }
  public mapEachFile<T>(fn: (file: File) => T): T[] {
    return this.children.map(fn);
  }
  public addFile(file: File) {
    assert(file.parent === null);
    this.children.push(file);
    file.parent = this;
    this.notifyDidChangeChildren();
  }
  public removeFile(file: File) {
    assert(file.parent === this);
    const i = this.children.indexOf(file);
    assert(i >= 0);
    this.children.splice(i, 1);
    this.notifyDidChangeChildren();
  }
  public newDirectory(path: string | string[]): Directory {
    if (typeof path === "string") {
      path = path.split("/");
    }
    let directory: Directory = this;
    while (path.length) {
      const name = path.shift();
      let file = directory.getImmediateChild(name);
      if (file) {
        directory = file as Directory;
      } else {
        file = new Directory(name);
        directory.addFile(file);
        directory = file as Directory;
      }
    }
    assert(directory instanceof Directory);
    return directory;
  }
  public newFile(path: string | string[], type: FileType): File {
    if (typeof path === "string") {
      path = path.split("/");
    }
    let directory: Directory = this;
    if (path.length > 1) {
      directory = this.newDirectory(path.slice(0, path.length - 1));
    }
    const name = path[path.length - 1];
    let file = directory.getFile(name);
    if (file) {
      assert(file.type === type);
    } else {
      file = new File(path[path.length - 1], type);
      directory.addFile(file);
    }
    return file;
  }
  public getImmediateChild(name: string): File {
    return this.children.find((file: File) => {
      return file.name === name;
    });
  }
  public getFile(path: string | string[]): File {
    if (typeof path === "string") {
      path = path.split("/");
    }
    const file = this.getImmediateChild(path[0]);
    if (path.length > 1) {
      if (file && file.type === FileType.Directory) {
        return (file as Directory).getFile(path.slice(1));
      } else {
        return null;
      }
    }
    return file;
  }
  public list(): string[] {
    const list: string[] = [];
    function recurse(prefix: string, x: Directory) {
      if (prefix) {
        prefix += "/";
      }
      x.forEachFile((file) => {
        const path = prefix + file.name;
        if (file instanceof Directory) {
          recurse(path, file);
        } else {
          list.push(path);
        }
      });
    }
    recurse("", this);
    return list;
  }
  public glob(pattern: string): string[] {
    const mm = new Minimatch(pattern);
    return this.list().filter((path) => mm.match(path));
  }
  public globFiles(pattern: string): File[] {
    return this.glob(pattern).map((path) => this.getFile(path));
  }
}

export class Project extends Directory {
  public onChange = new EventDispatcher("Project Change");
  public onDirtyFileUsed = new EventDispatcher("Dirty File Used");

  constructor() {
    super("Project");
  }

  public static onRun = new EventDispatcher("Project Run");
  public static run() {
    Project.onRun.dispatch();
  }

  public static onBuild = new EventDispatcher("Project Build");
  public static build() {
    Project.onBuild.dispatch();
  }

  // saveProject(openedFiles: string [][], uri: string) {
  //   Service.saveProject(this, openedFiles, uri);
  // }

  // forkProject() {
  //   Service.saveProject(this, []);
  // }
}

export interface ILogger {
  logLn(message: string, kind?: string): void;
}
