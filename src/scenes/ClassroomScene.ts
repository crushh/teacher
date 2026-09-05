import { gsap } from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';

import { jumpTo } from '../animations/jump';
import { GAME_HEIGHT, GAME_WIDTH, MOVIE_CONFIG } from '../game/config';
import { Teacher } from '../entities/Teacher';
import type { Scene, GsapTimeline } from './Scene';

const COLORS = {
  wall: 0xf0d9b5,
  wallShadow: 0xd6b98e,
  floor: 0x8b604b,
  desk: 0x5d3c36,
  deskTop: 0x8f5e43,
  board: 0x294c4b,
  boardText: 0xd9edc2,
  window: 0x7cc7e6,
  frame: 0x68483d,
  ink: 0x2b2030,
  accent: 0xffc857,
  speed: 0xfff0b5,
} as const;

type StudentState = 'sleeping' | 'phone' | 'laptop' | 'daydream' | 'listening';

export class ClassroomScene implements Scene {
  readonly id = 'classroom';
  readonly root = new Container({ label: 'ClassroomScene.root' });

  private readonly teacher: Teacher;
  private readonly speedLines = new Graphics();
  private activeTimeline: GsapTimeline | undefined;
  private context: gsap.Context | undefined;
  private built = false;

  constructor(teacher: Teacher, sceneHost: Container) {
    this.teacher = teacher;
    sceneHost.addChild(this.root);
  }

  build(): void {
    if (this.built) return;

    this.root.addChild(this.createBackground());
    this.root.addChild(this.createBlackboard());
    this.root.addChild(this.createWindow());
    this.root.addChild(this.createStudents());
    this.root.addChild(this.createDesks());
    this.root.addChild(this.createTeacherMark());
    this.root.addChild(this.speedLines);
    this.built = true;
    this.reset();
  }

  createTimeline(): GsapTimeline {
    if (!this.built) this.build();

    this.context?.revert();

    let timeline: GsapTimeline | undefined;
    this.context = gsap.context(() => {
      timeline = gsap.timeline({
        id: `scene:${this.id}`,
        defaults: { overwrite: 'auto' },
      });

      const classroomEntranceTL = this.createClassroomEntranceTL();
      const classroomTeachingTL = this.createClassroomTeachingTL();
      const classroomEscapeTL = this.createClassroomEscapeTL();

      timeline.add(classroomEntranceTL, 0);
      timeline.add(classroomTeachingTL, MOVIE_CONFIG.classroom.entranceDuration);
      timeline.add(classroomEscapeTL, MOVIE_CONFIG.classroom.runStartAt);
    });

    if (!timeline) {
      throw new Error('ClassroomScene timeline was not created.');
    }

    this.activeTimeline = timeline;
    return timeline;
  }

  reset(): void {
    this.resetContainer(this.root, true);
    this.resetContainer(this.speedLines, false);
    this.teacher.reset();
    this.resetTeacherForEntrance();
  }

  isTeacherReset(): boolean {
    return (
      nearlyEqual(this.teacher.root.x, MOVIE_CONFIG.classroom.offscreenLeft) &&
      nearlyEqual(this.teacher.root.y, MOVIE_CONFIG.classroom.entranceY) &&
      nearlyEqual(this.teacher.root.rotation, 0) &&
      nearlyEqual(this.teacher.root.scale.x, 1) &&
      nearlyEqual(this.teacher.root.scale.y, 1) &&
      nearlyEqual(this.teacher.root.alpha, 1) &&
      !this.teacher.root.visible &&
      nearlyEqual(this.teacher.visual.x, 0) &&
      nearlyEqual(this.teacher.visual.y, 0) &&
      nearlyEqual(this.teacher.visual.rotation, 0) &&
      nearlyEqual(this.teacher.visual.scale.x, 1) &&
      nearlyEqual(this.teacher.visual.scale.y, 1)
    );
  }

  dispose(): void {
    this.activeTimeline?.kill();
    this.context?.revert();
    this.activeTimeline = undefined;
    this.context = undefined;
    this.root.removeChildren();
    this.built = false;
  }

  private createClassroomEntranceTL(): GsapTimeline {
    const timeline = gsap.timeline({
      id: 'classroomEntranceTL',
      defaults: { overwrite: 'auto' },
    });

    timeline.set(this.root, { visible: true, alpha: 1 }, 0);
    timeline.set(this.speedLines, { visible: true, alpha: 0 }, 0);
    timeline.set(this.teacher.root, {
      x: MOVIE_CONFIG.classroom.offscreenLeft,
      y: MOVIE_CONFIG.classroom.entranceY,
      visible: false,
      alpha: 1,
    }, 0);
    timeline.set(this.teacher.root, { visible: true }, 0);
    timeline.call(() => this.teacher.setPose('run'), [], 0);
    timeline.to(this.teacher.root, {
      x: MOVIE_CONFIG.teacher.startX,
      duration: MOVIE_CONFIG.classroom.entranceDuration,
      ease: 'power1.out',
    }, 0);

    return timeline;
  }

  private createClassroomTeachingTL(): GsapTimeline {
    const timeline = gsap.timeline({
      id: 'classroomTeachingTL',
      defaults: { overwrite: 'auto' },
    });
    const entranceDuration = MOVIE_CONFIG.classroom.entranceDuration;
    const talkAt = Math.max(0, MOVIE_CONFIG.classroom.teacherTalkAt - entranceDuration);

    timeline.call(() => this.teacher.setPose('talk'), [], talkAt);
    timeline.to(this.teacher.visual, {
      y: -3,
      duration: 0.35,
      ease: 'sine.inOut',
      repeat: 7,
      yoyo: true,
    }, talkAt);
    timeline.call(() => this.teacher.setPose('idle'), [], MOVIE_CONFIG.classroom.teacherPauseAt - entranceDuration);
    timeline.to(this.teacher.visual, {
      rotation: -0.14,
      duration: 0.18,
      ease: 'power2.out',
    }, MOVIE_CONFIG.classroom.lookAtWindowAt - entranceDuration);

    return timeline;
  }

  private createClassroomEscapeTL(): GsapTimeline {
    const timeline = gsap.timeline({
      id: 'classroomEscapeTL',
      defaults: { overwrite: 'auto' },
    });
    const jumpAt = MOVIE_CONFIG.classroom.windowJumpAt - MOVIE_CONFIG.classroom.runStartAt;

    timeline.call(() => this.teacher.setPose('run'), [], 0);
    timeline.to(this.teacher.visual, {
      y: -5,
      duration: 0.2,
      ease: 'sine.inOut',
      repeat: 3,
      yoyo: true,
    }, 0);
    timeline.to(this.teacher.root, {
      x: 510,
      duration: jumpAt,
      ease: 'power2.in',
    }, 0);
    timeline.call(() => this.teacher.setPose('jump'), [], jumpAt);
    timeline.add(jumpTo({
      target: this.teacher.root,
      startX: 510,
      startY: MOVIE_CONFIG.classroom.entranceY,
      targetX: MOVIE_CONFIG.classroom.offscreenRight,
      targetY: 150,
      height: 38,
      duration: MOVIE_CONFIG.classroom.windowExitAt - MOVIE_CONFIG.classroom.windowJumpAt,
    }), jumpAt);
    timeline.to(this.speedLines, {
      alpha: 0.9,
      duration: 0.08,
      ease: 'none',
    }, jumpAt);
    timeline.to(this.speedLines, {
      alpha: 0,
      duration: 0.25,
      ease: 'power1.out',
    }, jumpAt + 0.25);

    return timeline;
  }

  private resetTeacherForEntrance(): void {
    this.teacher.root.position.set(
      MOVIE_CONFIG.classroom.offscreenLeft,
      MOVIE_CONFIG.classroom.entranceY,
    );
    this.teacher.root.rotation = 0;
    this.teacher.root.scale.set(1, 1);
    this.teacher.root.pivot.set(0, 0);
    this.teacher.root.skew.set(0, 0);
    this.teacher.root.alpha = 1;
    this.teacher.root.visible = false;
  }

  private createBackground(): Graphics {
    return new Graphics()
      .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .fill(COLORS.wall)
      .rect(0, 250, GAME_WIDTH, 110)
      .fill(COLORS.floor)
      .rect(0, 246, GAME_WIDTH, 5)
      .fill(COLORS.wallShadow)
      .rect(0, 308, GAME_WIDTH, 3)
      .fill({ color: 0x4c3740, alpha: 0.35 });
  }

  private createBlackboard(): Graphics {
    const board = new Graphics()
      .roundRect(42, 52, 320, 112, 4)
      .fill(COLORS.frame)
      .roundRect(49, 59, 306, 98, 2)
      .fill(COLORS.board);
    board
      .rect(74, 84, 68, 4)
      .fill({ color: COLORS.boardText, alpha: 0.85 })
      .rect(74, 101, 120, 3)
      .fill({ color: COLORS.boardText, alpha: 0.55 })
      .rect(74, 118, 90, 3)
      .fill({ color: COLORS.boardText, alpha: 0.55 })
      .circle(296, 93, 10)
      .stroke({ color: COLORS.accent, width: 3 })
      .moveTo(284, 126)
      .lineTo(314, 126)
      .stroke({ color: COLORS.boardText, width: 3 });
    return board;
  }

  private createWindow(): Container {
    const window = new Container({ label: 'classroomWindow' });
    const outside = new Graphics()
      .rect(500, 58, 112, 136)
      .fill(COLORS.frame)
      .rect(508, 66, 96, 120)
      .fill(COLORS.window)
      .rect(508, 144, 96, 42)
      .fill(0x5a9dba)
      .rect(520, 119, 22, 25)
      .fill(0x536b83)
      .rect(550, 100, 26, 44)
      .fill(0x536b83)
      .rect(579, 128, 18, 16)
      .fill(0x536b83)
      .rect(553, 66, 5, 120)
      .fill(COLORS.frame)
      .rect(508, 125, 96, 5)
      .fill(COLORS.frame);
    window.addChild(outside);

    const sign = new Text({
      text: 'WINDOW',
      style: {
        fill: COLORS.ink,
        fontFamily: 'monospace',
        fontSize: 8,
        fontWeight: '700',
      },
    });
    sign.position.set(513, 201);
    window.addChild(sign);
    return window;
  }

  private createStudents(): Container {
    const students = new Container({ label: 'students' });
    const states: Array<[number, number, StudentState]> = [
      [92, 226, 'sleeping'],
      [198, 226, 'phone'],
      [306, 226, 'laptop'],
      [414, 226, 'daydream'],
      [516, 226, 'listening'],
    ];
    states.forEach(([x, y, state], index) => {
      students.addChild(this.createStudent(x, y, state, index));
    });
    return students;
  }

  private createStudent(x: number, y: number, state: StudentState, index: number): Container {
    const student = new Container({ label: `student:${state}` });
    student.position.set(x, y);
    const shirtColor = index % 2 === 0 ? 0xa5c3cf : 0xe3a1a1;
    const head = new Graphics()
      .circle(0, -23, 10)
      .fill(0xf0b78f)
      .rect(-10, -34, 20, 5)
      .fill(0x3b2f40)
      .roundRect(-14, -12, 28, 22, 3)
      .fill(shirtColor);
    student.addChild(head);

    if (state === 'sleeping') {
      student.addChild(new Graphics().rect(-15, 1, 30, 4).fill(COLORS.deskTop));
      student.addChild(this.createText('Z', 12, -56, COLORS.accent));
    }
    if (state === 'phone') {
      student.addChild(new Graphics().rect(6, -10, 9, 14).fill(0x273344).stroke({ color: COLORS.accent, width: 1 }));
    }
    if (state === 'laptop') {
      student.addChild(new Graphics().poly([-17, 5, 17, 5, 12, 12, -12, 12]).fill(0x31465c));
    }
    if (state === 'daydream') {
      student.addChild(new Graphics().circle(22, -38, 3).fill(0xffffff).circle(29, -48, 5).fill(0xffffff));
      student.addChild(this.createText('...', 30, -56, COLORS.ink));
    }
    if (state === 'listening') {
      student.addChild(new Graphics().rect(15, -28, 5, 18).fill(0xf0b78f));
    }

    return student;
  }

  private createDesks(): Container {
    const desks = new Container({ label: 'desks' });
    [92, 198, 306, 414, 516].forEach((x) => {
      desks.addChild(new Graphics()
        .roundRect(x - 34, 237, 68, 8, 2)
        .fill(COLORS.deskTop)
        .rect(x - 28, 245, 5, 25)
        .fill(COLORS.desk)
        .rect(x + 23, 245, 5, 25)
        .fill(COLORS.desk));
    });
    return desks;
  }

  private createTeacherMark(): Text {
    return this.createText('TEACHER  /  CLASSROOM', 42, 334, COLORS.accent);
  }

  private createText(text: string, x: number, y: number, fill: number): Text {
    const label = new Text({
      text,
      style: {
        fill,
        fontFamily: 'monospace',
        fontSize: 9,
        fontWeight: '700',
      },
    });
    label.position.set(x, y);
    return label;
  }

  private resetContainer(container: Container, visible: boolean): void {
    container.position.set(0, 0);
    container.rotation = 0;
    container.scale.set(1, 1);
    container.pivot.set(0, 0);
    container.skew.set(0, 0);
    container.alpha = visible ? 1 : 0;
    container.visible = visible;
    container.tint = 0xffffff;
  }
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.0001;
}
