export type PromiseMaker = () => Promise<any>;

class Task {
  public dependencies: Task [];
  public promiseMaker: PromiseMaker;

  constructor(dependencies: Task [], promiseMaker: PromiseMaker) {
    this.dependencies = dependencies;
    this.promiseMaker = promiseMaker;
  }
}

class TaskInstance {
  public task: Task;
  public promise: Promise<any>;
  constructor(task: Task) {
    this.task = task;
    this.promise = null;
  }
  public makePromise(): Promise<any> {
    if (this.promise) {
      return this.promise;
    }
    return this.promise = this.task.promiseMaker();
  }
}

class GulpySession {
  private gulpy: Gulpy;
  private tasks: Map<Task, TaskInstance> = new Map();
  constructor(gulpy: Gulpy) {
    this.gulpy = gulpy;
  }
  public ensureInstance(task: Task): TaskInstance {
    let instance = this.tasks.get(task);
    if (instance) {
      return instance;
    }
    instance = new TaskInstance(task);
    this.tasks.set(task, instance);
    return instance;
  }
  async runInstance(instance: TaskInstance): Promise<any> {
    const dependencies = instance.task.dependencies.map(x => this.ensureInstance(x));
    await Promise.all(dependencies.map(x => this.runInstance(x)));
    return instance.makePromise();
  }
  public run(task: Task): Promise<any> {
    return this.runInstance(this.ensureInstance(task));
  }
}
export class Gulpy {
  private tasks: { [name: string]: Task } = {};
  private session: GulpySession;

  public task(name: string, fn: PromiseMaker): void;
  public task(name: string, dependencies: string[], fn: PromiseMaker): void;
  public task(name: string, a: string [] | PromiseMaker, b?: PromiseMaker): void {
    let dependencies: string [] = [];
    let fn: PromiseMaker = null;
    if (arguments.length === 3) {
      dependencies = a as string [];
      fn = b;
    } else if (arguments.length === 2) {
      fn = a as PromiseMaker;
    }
    this.tasks[name] = new Task(dependencies.map((x) => this.tasks[x]), fn);
  }
  public series(tasks: string[]): PromiseMaker {
    return null;
  }
  public parallel(tasks: string[]): PromiseMaker {
    return null;
  }
  public run(name: string) {
    const session = new GulpySession(this);
    session.run(this.tasks[name]);
  }
}

export function testGulpy() {
  const gulp = new Gulpy();

  gulp.task("b", () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log("Running Task B " + performance.now());
        resolve();
      }, 50);
    });
  });

  gulp.task("c", [], () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log("Running Task C " + performance.now());
        resolve();
      }, 100);
    });
  });

  gulp.task("a", ["b", "c"], () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log("Running Task A " + performance.now());
        resolve();
      }, 200);
    });
  });

  gulp.run("a");
}
