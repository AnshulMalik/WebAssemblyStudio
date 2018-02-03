import "monaco-editor";
import { BinaryReader, WasmDisassembler } from "wasmparser";
import { assert } from "./index";
import { Directory, File, FileType, Problem, Project } from "./model";
import { decodeRestrictedBase64ToBytes, isBranch, padLeft, padRight, toAddress } from "./util";

declare interface IBinaryenModule {
  optimize(): any;
  validate(): any;
  emitBinary(): ArrayBuffer;
  emitText(): string;
}

declare var Binaryen: {
  readBinary(data: ArrayBuffer): IBinaryenModule;
  parseText(data: string): IBinaryenModule;
};

declare var capstone: {
  ARCH_X86: any;
  MODE_64: any;
  Cs: any;
};

declare var base64js: {
  toByteArray(base64: string): ArrayBuffer;
  fromByteArray(base64: ArrayBuffer): string;
};

declare var Module: ({ }) => any;
declare var define: any;
declare var showdown: {
  Converter: any;
  setFlavor: Function;
};

declare var wabt: {
  ready: Promise<any>
  readWasm: Function;
  parseWat: Function;
};

export enum Language {
  C = "c",
  Cpp = "cpp",
  Wast = "wast",
  Wasm = "wasm",
  Cretonne = "cton",
  x86 = "x86",
}

interface IFile {
  name: string;
  type: string;
  children: IFile[];
  data: string;
}

export interface IServiceRequestTask {
  file: string;
  name: string;
  output: string;
  console: string;
  success: boolean;
}

export interface IServiceRequest {
  success: boolean;
  tasks: IServiceRequestTask[];
  output: string;
}

export class Service {
  public static sendRequest(command: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.addEventListener("load", function() {
        resolve(this);
      });
      xhr.addEventListener("error", function() {
        reject(this);
      });
      xhr.open("POST", "//wasmexplorer-service.herokuapp.com/service.php", true);
      xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
      xhr.send(command);
    });
  }

  public static getMarkers(response: string): monaco.editor.IMarkerData[] {
    // Parse and annotate errors if compilation fails.
    const annotations: monaco.editor.IMarkerData[] = [];
    if (response.indexOf("(module") !== 0) {
      const re1 = /^.*?:(\d+?):(\d+?):\s(.*)$/gm;
      let m: any;
      // Single position.
      while ((m = re1.exec(response)) !== null) {
        if (m.index === re1.lastIndex) {
          re1.lastIndex++;
        }
        const startLineNumber = parseInt(m[1], 10);
        const startColumn = parseInt(m[2], 10);
        const message = m[3];
        let severity = monaco.Severity.Info;
        if (message.indexOf("error") >= 0) {
          severity = monaco.Severity.Error;
        } else if (message.indexOf("warning") >= 0) {
          severity = monaco.Severity.Warning;
        }
        annotations.push({
          severity, message,
          startLineNumber, startColumn,
          endLineNumber: startLineNumber, endColumn: startColumn,
        });
      }
      // Range. This is generated via the -diagnostics-print-source-range-info
      // clang flag.
      const re2 = /^.*?:\d+?:\d+?:\{(\d+?):(\d+?)-(\d+?):(\d+?)\}:\s(.*)$/gm;
      while ((m = re2.exec(response)) !== null) {
        if (m.index === re2.lastIndex) {
          re2.lastIndex++;
        }
        const message = m[5];
        let severity = monaco.Severity.Info;
        if (message.indexOf("error") >= 0) {
          severity = monaco.Severity.Error;
        } else if (message.indexOf("warning") >= 0) {
          severity = monaco.Severity.Warning;
        }
        annotations.push({
          severity, message,
          startLineNumber: parseInt(m[1], 10), startColumn: parseInt(m[2], 10),
          endLineNumber: parseInt(m[3], 10), endColumn: parseInt(m[4], 10),
        });
      }
    }
    return annotations;
  }

  public static compileFile(file: File, from: Language, to: Language, options = ""): Promise<any> {
    return new Promise((resolve, reject) => {
      Service.compile(file.getData(), from, to, options).then((result) => {
        const markers = Service.getMarkers(result.tasks[0].console);
        if (markers.length) {
          monaco.editor.setModelMarkers(file.buffer, "compiler", markers);
          file.setProblems(markers.map((marker) => {
            return Problem.fromMarker(marker);
          }));
        }
        if (!result.success) {
          reject();
          return;
        }
        const buffer = atob(result.output);
        const data = new Uint8Array(buffer.length);
        for (let i = 0; i < buffer.length; i++) {
          data[i] = buffer.charCodeAt(i);
        }
        resolve(data);
      });
    });
  }

  public static compile(src: string | ArrayBuffer, from: Language, to: Language, options = ""): Promise<IServiceRequest> {
    if (from === Language.C && to === Language.Wasm) {
      const project = {
        output: "wasm",
        files: [
          {
            type: from,
            name: "file." + from,
            options,
            src,
          },
        ],
      };
      const input = encodeURIComponent(JSON.stringify(project)).replace("%20", "+");
      return new Promise((resolve, reject) => {
        this.sendRequest("input=" + input + "&action=build").then((x) => {
          try {
            resolve(JSON.parse(x.responseText) as IServiceRequest);
          } catch (e) {
            console.error(e);
            reject();
          }
        }).catch(() => {
          reject();
        });
      });
    } else if (from === Language.Wasm && to === Language.x86) {
      const input = encodeURIComponent(base64js.fromByteArray(src as ArrayBuffer));
      return new Promise((resolve, reject) => {
        this.sendRequest("input=" + input + "&action=wasm2assembly&options=" + encodeURIComponent(options)).then((x) => {
          try {
            resolve(JSON.parse(x.responseText) as IServiceRequest);
          } catch (e) {
            console.error(e);
            reject();
          }
        }).catch(() => {
          reject();
        });
      });
    }
    return;
    /*
    src = encodeURIComponent(src).replace('%20', '+');
    if (from === Language.C && to === Language.Wast) {
      let action = "c2wast";
      let version = "2";
      options = "-O3 -fdiagnostics-print-source-range-info " + options;
      let command = [
        `input=${src}`,
        `action=${action}`,
        `version=${version}`,
        `options=${encodeURIComponent(options)}`
      ]
      return new Promise((resolve, reject) => {
        this.sendRequest(command.join("&")).then((x) => {
          resolve(x);
        }).catch(() => {
          reject();
        })
      });
    } else if (from === Language.Wast && to === Language.Wasm) {
      let action = "wast2wasm";
      let version = "";
      let command = [
        `input=${src}`,
        `action=${action}`,
        `version=${version}`,
        `options=${encodeURIComponent(options)}`
      ]
      return new Promise((resolve, reject) => {
        this.sendRequest(command.join("&")).then((x) => {
          var buffer = atob(x.responseText.split('\n', 2)[1]);
          var data = new Uint8Array(buffer.length);
          for (var i = 0; i < buffer.length; i++) {
            data[i] = buffer.charCodeAt(i);
          }
          resolve(data);
        }).catch(() => {
          reject();
        })
      });
    } else if (from === Language.Wast && to === Language.x86) {
      let action = "wast2assembly";
      let version = "";
      let command = [
        `input=${src}`,
        `action=${action}`,
        `version=${version}`,
        `options=${encodeURIComponent(options)}`
      ]
      return new Promise((resolve, reject) => {
        this.sendRequest(command.join("&")).then((x) => {
          let data = JSON.parse(x.responseText)
          resolve(data);
        }).catch(() => {
          reject();
        })
      });
    }
    */
  }

  public static disassembleWasm(buffer: ArrayBuffer): Promise<string> {
    return new Promise((resolve, reject) => {
      function disassemble() {
        const module = wabt.readWasm(buffer, { readDebugNames: true });
        if (true) {
          module.generateNames();
          module.applyNames();
        }
        return module.toText({ foldExprs: false, inlineExport: true });
      }
      if (typeof wabt !== "undefined") {
        resolve(disassemble());
      } else {
        Service.lazyLoad("lib/libwabt.js").then(() => {
          wabt.ready.then(() => {
            resolve(disassemble());
          });
        });
      }
    });
  }

  public static disassembleWasmWithWabt(file: File) {
    Service.disassembleWasm(file.getData() as ArrayBuffer).then((result) => {
      const output = file.parent.newFile(file.name + ".wast", FileType.Wast);
      output.description = "Disassembled from " + file.name + " using Wabt.";
      output.setData(result);
    });
  }

  public static assembleWast(wast: string): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      function assemble() {
        const module = wabt.parseWat("test.wast", wast);
        module.resolveNames();
        module.validate();
        const binary = module.toBinary({ log: true, write_debug_names: true });
        return binary.buffer;
      }
      if (typeof wabt !== "undefined") {
        resolve(assemble());
      } else {
        Service.lazyLoad("lib/libwabt.js").then(() => {
          wabt.ready.then(() => {
            resolve(assemble());
          });
        });
      }
    });
  }

  public static assembleWastWithWabt(file: File) {
    Service.assembleWast(file.getData() as string).then((result) => {
      const output = file.parent.newFile(file.name + ".wasm", FileType.Wasm);
      output.description = "Assembled from " + file.name + " using Wabt.";
      output.setData(result);
    });
  }

  public static disassembleWasmWithWasmDisassembler(file: File) {
    const buffer = file.getData() as ArrayBuffer;
    const reader = new BinaryReader();
    reader.setData(buffer, 0, buffer.byteLength);
    const dis = new WasmDisassembler();
    dis.addOffsets = true;
    dis.disassembleChunk(reader);
    const result = dis.getResult().lines.join("\n");
    const output = file.parent.newFile(file.name + ".wast", FileType.Wast);
    output.description = "Disassembled from " + file.name + " using WasmDisassembler.";
    output.setData(result);
    return;
  }

  public static loadJSON(uri: string): Promise<{}> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const self = this;
      xhr.addEventListener("load", function() {
        resolve(JSON.parse(this.response));
      });
      xhr.addEventListener("error", function() {
        reject(this.response);
      });
      const url = "https://api.myjson.com/bins/" + uri;
      xhr.open("GET", url, true);
      xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
      xhr.send();
    });
  }

  public static saveJSON(json: object, uri: string): Promise<string> {
    const update = !!uri;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.addEventListener("load", function() {
        if (update) {
          resolve(uri);
        } else {
          let jsonURI = JSON.parse(this.response).uri;
          jsonURI = jsonURI.substring(jsonURI.lastIndexOf("/") + 1);
          resolve(jsonURI);
        }
      });
      xhr.addEventListener("error", function() {
        reject();
      });
      if (update) {
        xhr.open("PUT", "//api.myjson.com/bins/" + uri, true);
      } else {
        xhr.open("POST", "//api.myjson.com/bins", true);
      }
      xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
      xhr.send(JSON.stringify(json));
    });
  }

  public static parseFiddleURI(): string {
    let uri = window.location.search.substring(1);
    if (uri) {
      const i = uri.indexOf("/");
      if (i > 0) {
        uri = uri.substring(0, i);
      }
    }
    return uri;
  }

  public static saveProject(project: Project, openedFiles: string[][], uri?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      function serialize(file: File): any {
        if (file instanceof Directory) {
          return {
            name: file.name,
            children: file.mapEachFile((file: File) => serialize(file)),
          };
        } else {
          return {
            name: file.name,
            type: file.type,
            data: file.data,
          };
        }
      }
      const json = serialize(project);
      json.openedFiles = openedFiles;
      this.saveJSON(json, uri).then((result) => {
        resolve(result);
      });
    });
  }

  public static loadProject(json: any, project: Project): Promise<any> {
    function deserialize(json: IFile | IFile[]): any {
      if (Array.isArray(json)) {
        return json.map((x: any) => deserialize(x));
      } else if (json.children) {
        const directory = new Directory(json.name);
        deserialize(json.children).forEach((file: File) => {
          directory.addFile(file);
        });
        return directory;
      } else {
        const file = new File(json.name, json.type as FileType);
        file.setData(json.data);
        return file;
      }
    }
    return new Promise((resolve, reject) => {
      project.name = json.name;
      deserialize(json.children).forEach((file: File) => {
        project.addFile(file);
      });
      resolve(json);
    });
  }

  public static lazyLoad(uri: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const self = this;
      const d = window.document;
      const b = d.body;
      const e = d.createElement("script");
      e.async = true;
      e.src = uri;
      b.appendChild(e);
      e.onload = function() {
        resolve(this);
      };
    });
  }

  public static optimizeWasmWithBinaryen(file: File) {
    function optimize() {
      let data = file.getData() as ArrayBuffer;
      const module = Binaryen.readBinary(data);
      module.optimize();
      data = module.emitBinary();
      file.setData(data);
      Service.disassembleWasm(data).then((result) => {
        file.buffer.setValue(result);
      });
    }
    if (typeof Binaryen !== "undefined") {
      optimize();
    } else {
      Service.lazyLoad("lib/binaryen.js").then(() => {
        optimize();
      });
    }
  }

  public static validateWasmWithBinaryen(file: File) {
    function validate() {
      const data = file.getData() as ArrayBuffer;
      const module = Binaryen.readBinary(data);
      alert(module.validate());
    }
    if (typeof Binaryen !== "undefined") {
      validate();
    } else {
      Service.lazyLoad("lib/binaryen.js").then(() => {
        validate();
      });
    }
  }

  public static validateWastWithBinaryen(file: File) {
    function validate() {
      const data = file.getData() as string;
      const module = Binaryen.parseText(data);
      alert(module.validate());
    }
    if (typeof Binaryen !== "undefined") {
      validate();
    } else {
      Service.lazyLoad("lib/binaryen.js").then(() => {
        validate();
      });
    }
  }

  public static disassembleWasmWithBinaryen(file: File) {
    function disassemble() {
      const data = file.getData() as ArrayBuffer;
      const module = Binaryen.readBinary(data);
      const output = file.parent.newFile(file.name + ".wast", FileType.Wast);
      output.description = "Disassembled from " + file.name + " using Binaryen.";
      output.setData(module.emitText());
    }
    if (typeof Binaryen !== "undefined") {
      disassemble();
    } else {
      Service.lazyLoad("lib/binaryen.js").then(() => {
        disassemble();
      });
    }
  }

  public static downloadLink: HTMLAnchorElement = null;
  public static download(file: File) {
    if (!Service.downloadLink) {
      Service.downloadLink = document.createElement("a");
      Service.downloadLink.style.display = "none";
      document.body.appendChild(Service.downloadLink);
    }
    assert(file.type === FileType.Wasm);
    const url = URL.createObjectURL(new Blob([file.getData()], { type: "application/wasm" }));
    Service.downloadLink.href = url;
    Service.downloadLink.download = file.name;
    if (Service.downloadLink.href as any !== document.location) {
      Service.downloadLink.click();
    }
  }

  // static disassembleWasmWithWasmDisassembler(file: File) {
  //   let data = file.getData() as ArrayBuffer;
  //   let output = file.parent.newFile(file.name + ".wast", FileType.Wast);
  //   output.description = "Disassembled from " + file.name + " using WasmDisassembler.";
  //   output.setData(Service.disassembleWasm(data));
  // }

  public static clangFormatModule: any = null;
  // Kudos to https://github.com/tbfleming/cib
  public static clangFormat(file: File) {
    function format() {
      const result = Service.clangFormatModule.ccall("formatCode", "string", ["string"], [file.buffer.getValue()]);
      file.buffer.setValue(result);
    }
    if (Service.clangFormatModule) {
      format();
    } else {
      Service.lazyLoad("lib/clang-format.js").then(() => {
        const module: any = {
          postRun() {
            format();
          },
        };
        fetch("lib/clang-format.wasm").then((response) => response.arrayBuffer()).then((wasmBinary) => {
          module.wasmBinary = wasmBinary;
          Service.clangFormatModule = Module(module);
        });
      });
    }
  }

  public static disassembleX86(file: File, options = "") {
    const output = file.parent.newFile(file.name + ".x86", FileType.x86);

    function toBytes(a: any) {
      return a.map(function(x: any) { return padLeft(Number(x).toString(16), 2, "0"); }).join(" ");
    }
    function disassemble() {
      const data = file.getData() as string;
      Service.compile(data, Language.Wasm, Language.x86, options).then((json: any) => {
        let s = "";
        const cs = new capstone.Cs(capstone.ARCH_X86, capstone.MODE_64);
        const annotations: any[] = [];
        const assemblyInstructionsByAddress = Object.create(null);
        for (let i = 0; i < json.regions.length; i++) {
          const region = json.regions[i];
          s += region.name + ":\n";
          const csBuffer = decodeRestrictedBase64ToBytes(region.bytes);
          const instructions = cs.disasm(csBuffer, region.entry);
          const basicBlocks: any = {};
          instructions.forEach(function(instr: any, i: any) {
            assemblyInstructionsByAddress[instr.address] = instr;
            if (isBranch(instr)) {
              const targetAddress = parseInt(instr.op_str, 10);
              if (!basicBlocks[targetAddress]) {
                basicBlocks[targetAddress] = [];
              }
              basicBlocks[targetAddress].push(instr.address);
              if (i + 1 < instructions.length) {
                basicBlocks[instructions[i + 1].address] = [];
              }
            }
          });
          instructions.forEach(function(instr: any) {
            if (basicBlocks[instr.address]) {
              s += " " + padRight(toAddress(instr.address) + ":", 39, " ");
              if (basicBlocks[instr.address].length > 0) {
                s += "; " + toAddress(instr.address) + " from: [" + basicBlocks[instr.address].map(toAddress).join(", ") + "]";
              }
              s += "\n";
            }
            s += "  " + padRight(instr.mnemonic + " " + instr.op_str, 38, " ");
            s += "; " + toAddress(instr.address) + " " + toBytes(instr.bytes) + "\n";
          });
          s += "\n";
        }
        output.setData(s);
      });
    }
    if (typeof capstone !== "undefined") {
      disassemble();
    } else {
      Service.lazyLoad("lib/capstone.x86.min.js").then(() => {
        disassemble();
      });
    }
  }

  public static compileMarkdownToHtml(src: string): Promise<string> {
    return new Promise((resolve, reject) => {
      function compile() {
        const converter = new showdown.Converter({ tables: true });
        showdown.setFlavor("github");
        resolve(converter.makeHtml(src));
      }
      if (typeof showdown !== "undefined") {
        compile();
      } else {
        Service.lazyLoad("lib/showdown.min.js").then(() => {
          compile();
        });
      }
    });
  }
}
