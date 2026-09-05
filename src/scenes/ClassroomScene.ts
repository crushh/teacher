import { gsap } from 'gsap';
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Texture } from 'pixi.js';

import type { ClassroomEnvironmentTextures } from '../assets/classroomAssets';
import { jumpTo } from '../animations/jump';
import { GAME_HEIGHT, GAME_WIDTH, MOVIE_CONFIG } from '../game/config';
import { Teacher } from '../entities/Teacher';
import { createDialogueOverlay, type DialogueOverlay } from '../ui/DialogueOverlay';
import type { Scene, GsapTimeline } from './Scene';

const COLORS = {
  desk: 0x5d3c36,
  deskTop: 0x8f5e43,
  ink: 0x2b2030,
  accent: 0xffc857,
  clock: 0xf6f0d7,
  clockHand: 0x2b2030,
} as const;

type StudentState = 'sleeping' | 'phone' | 'laptop' | 'daydream' | 'listening';

interface DialogueOptions {
  readonly at: number;
  readonly endAt: number;
  readonly speaker: string;
  readonly text: string;
  readonly label: string;
}

export class ClassroomScene implements Scene {
  readonly id = 'classroom';
  readonly root = new Container({ label: 'ClassroomScene.root' });

  private readonly teacher: Teacher;
  private readonly environmentTextures: ClassroomEnvironmentTextures;
  private readonly dialogue: DialogueOverlay | undefined;
  private readonly backgroundLayer = new Container({ label: 'backgroundLayer' });
  private readonly deskLayer = new Container({ label: 'deskLayer' });
  private readonly grayboxStudents: Container;
  private readonly grayboxDesks: Container;
  private readonly speedLines = new Graphics({ label: 'classroomSpeedLines' });
  private readonly bellIndicator = new Container({ label: 'bellIndicator' });
  private doorOpenBg: Sprite | undefined;
  private doorClosedBg: Sprite | undefined;
  private deskEmpty: Sprite | undefined;
  private deskWithBooks: Sprite | undefined;
  private activeTimeline: GsapTimeline | undefined;
  private context: gsap.Context | undefined;
  private built = false;

  constructor(
    teacher: Teacher,
    sceneHost: Container,
    environmentTextures: ClassroomEnvironmentTextures,
    dialogueHost?: HTMLElement,
  ) {
    this.teacher = teacher;
    this.environmentTextures = environmentTextures;
    this.dialogue = dialogueHost ? createDialogueOverlay(dialogueHost) : undefined;
    this.grayboxStudents = this.createStudents();
    this.grayboxStudents.label = 'studentsBack.graybox';
    this.grayboxStudents.visible = false;
    this.grayboxDesks = this.createDesks();
    this.grayboxDesks.label = 'teacherDeskFront.graybox';
    this.grayboxDesks.visible = false;
    sceneHost.addChild(this.root);
  }

  build(): void {
    if (this.built) return;

    this.createEnvironmentLayers();
    this.root.addChild(this.backgroundLayer);
    this.root.addChild(this.createClock());
    this.root.addChild(this.grayboxStudents);
    this.root.addChild(this.grayboxDesks);
    this.root.addChild(this.deskLayer);
    this.root.addChild(this.createTeacherMark());
    this.createBellIndicator();
    this.root.addChild(this.bellIndicator);
    this.root.addChild(this.speedLines);
    this.built = true;
    this.reset();
  }

  createTimeline(): GsapTimeline {
    if (!this.built) this.build();

    this.activeTimeline?.kill();
    this.context?.revert();

    let timeline: GsapTimeline | undefined;
    this.context = gsap.context(() => {
      timeline = gsap.timeline({
        id: `scene:${this.id}`,
        defaults: { overwrite: 'auto' },
      });

      const classroom = MOVIE_CONFIG.classroom;
      const classroomTimeline = timeline;
      if (!this.doorOpenBg || !this.doorClosedBg || !this.deskEmpty || !this.deskWithBooks) {
        throw new Error('Classroom environment sprites were not created.');
      }
      const doorOpenBg = this.doorOpenBg;
      const doorClosedBg = this.doorClosedBg;
      const deskEmpty = this.deskEmpty;
      const deskWithBooks = this.deskWithBooks;
      const putBookEndAt = classroom.entranceDuration + classroom.putBookDuration;
      const blackboardEndAt = classroom.blackboardAt + classroom.blackboardDuration;

      classroomTimeline.addLabel('classroom:start', 0);
      classroomTimeline.set(this.root, { visible: true, alpha: 1 }, 0);
      classroomTimeline.set(doorOpenBg, { visible: true }, 0);
      classroomTimeline.set(doorClosedBg, { visible: false }, 0);
      classroomTimeline.set(deskEmpty, { visible: true }, 0);
      classroomTimeline.set(deskWithBooks, { visible: false }, 0);
      classroomTimeline.set(this.speedLines, { visible: true, alpha: 0 }, 0);
      classroomTimeline.set(this.bellIndicator, {
        visible: false,
        alpha: 0,
      }, 0);
      classroomTimeline.set(this.bellIndicator.scale, { x: 1, y: 1 }, 0);
      classroomTimeline.set(this.teacher.visual, {
        x: 0,
        y: 0,
        rotation: 0,
      }, 0);
      classroomTimeline.set(this.teacher.visual.scale, {
        x: classroom.teacherScale,
        y: classroom.teacherScale,
      }, 0);
      classroomTimeline.set(this.teacher.root, {
        x: classroom.offscreenLeft,
        y: classroom.teacherGroundY,
        visible: false,
        alpha: 1,
        rotation: 0,
      }, 0);
      classroomTimeline.set(this.teacher.root.scale, { x: 1, y: 1 }, 0);
      classroomTimeline.set(this.teacher.root, { visible: true }, 0);
      classroomTimeline.call(() => this.teacher.setPose('walkBook'), [], 0);
      classroomTimeline.addLabel('teacher:enter', 0);
      classroomTimeline.to(this.teacher.root, {
        x: classroom.teachingX,
        duration: classroom.entranceDuration,
        ease: 'power1.out',
      }, 0);
      classroomTimeline.to(this.teacher.visual, {
        y: -2,
        duration: classroom.talkFrameDuration / 1.5,
        ease: 'sine.inOut',
        repeat: 3,
        yoyo: true,
      }, 0);

      classroomTimeline.addLabel('teacher:inside', classroom.entranceDuration);
      classroomTimeline.addLabel('door:close', 'teacher:inside');
      classroomTimeline.set(doorOpenBg, { visible: false }, 'door:close');
      classroomTimeline.set(doorClosedBg, { visible: true }, 'door:close');

      classroomTimeline.call(() => this.teacher.setPose('putBook'), [], classroom.entranceDuration);
      classroomTimeline.addLabel('teacher:putBook', classroom.entranceDuration);
      classroomTimeline.addLabel('teacher:approachDesk', classroom.entranceDuration);
      classroomTimeline.addLabel('book:release', putBookEndAt);
      classroomTimeline.set(deskEmpty, { visible: false }, 'book:release');
      classroomTimeline.set(deskWithBooks, { visible: true }, 'book:release');
      classroomTimeline.set(this.teacher.visual, { y: 0 }, putBookEndAt);
      classroomTimeline.call(() => this.teacher.setPose('talk1'), [], classroom.lessonStartAt);
      classroomTimeline.addLabel('lesson:start', classroom.lessonStartAt);
      this.addTalkPoseSwitches(classroomTimeline, classroom.lessonStartAt, classroom.blackboardAt);
      this.addDialogue(classroomTimeline, {
        at: classroom.dialogueLanguageAt,
        endAt: classroom.dialogueLanguageEndAt,
        speaker: 'TEACHER',
        text: '中国語と日本語は違います！',
        label: 'dialogue:language',
      });

      classroomTimeline.call(() => this.teacher.setPose('blackboard'), [], classroom.blackboardAt);
      classroomTimeline.addLabel('board:look', classroom.blackboardAt);
      classroomTimeline.set(this.teacher.visual, { y: 0, rotation: 0 }, classroom.blackboardAt);
      classroomTimeline.call(() => this.teacher.setPose('talk1'), [], Math.max(classroom.talkResumeAt, blackboardEndAt));
      classroomTimeline.addLabel('lesson:resume', classroom.talkResumeAt);
      this.addTalkPoseSwitches(classroomTimeline, classroom.talkResumeAt, classroom.lookClockAt);

      classroomTimeline.call(() => this.teacher.setPose('lookClock'), [], classroom.lookClockAt);
      classroomTimeline.addLabel('clock:look', classroom.lookClockAt);
      this.addDialogue(classroomTimeline, {
        at: classroom.dialogueEndClassAt,
        endAt: classroom.dialogueEndClassEndAt,
        speaker: 'TEACHER',
        text: 'あ、もうこんな時間です…。',
        label: 'dialogue:endClass',
      });

      classroomTimeline.addLabel('bell', classroom.bellAt);
      classroomTimeline.call(() => this.triggerBell(), [], classroom.bellAt);
      classroomTimeline.call(() => this.teacher.setPose('react'), [], classroom.bellAt + 0.02);
      classroomTimeline.to(this.bellIndicator, {
        alpha: 1,
        duration: 0.1,
        ease: 'back.out(2)',
      }, classroom.bellAt);
      classroomTimeline.to(this.bellIndicator.scale, {
        x: 1.12,
        y: 1.12,
        duration: 0.1,
        ease: 'back.out(2)',
      }, classroom.bellAt);
      classroomTimeline.to(this.bellIndicator, {
        alpha: 0,
        duration: 0.26,
        ease: 'power1.out',
      }, classroom.bellAt + 0.1);
      classroomTimeline.to(this.bellIndicator.scale, {
        x: 1,
        y: 1,
        duration: 0.26,
        ease: 'power1.out',
      }, classroom.bellAt + 0.1);

      classroomTimeline.addLabel('sprint:start', classroom.runStartAt);
      this.addSprintPoseSwitches(classroomTimeline, classroom.runStartAt, classroom.windowJumpAt);
      classroomTimeline.to(this.teacher.root, {
        x: classroom.windowRunX,
        duration: classroom.windowJumpAt - classroom.runStartAt,
        ease: 'power2.in',
      }, classroom.runStartAt);
      classroomTimeline.to(this.teacher.visual, {
        y: -3,
        duration: classroom.sprintFrameDuration,
        ease: 'sine.inOut',
        repeat: 3,
        yoyo: true,
      }, classroom.runStartAt);

      classroomTimeline.call(() => this.teacher.setPose('jump'), [], classroom.windowJumpAt);
      classroomTimeline.addLabel('jump:start', classroom.windowJumpAt);
      classroomTimeline.add(jumpTo({
        target: this.teacher.root,
        startX: classroom.windowRunX,
        startY: classroom.teacherGroundY,
        targetX: classroom.offscreenRight,
        targetY: classroom.windowExitY,
        height: classroom.jumpHeight,
        duration: classroom.windowExitAt - classroom.windowJumpAt,
      }), classroom.windowJumpAt);
      classroomTimeline.to(this.teacher.visual, {
        rotation: 0.08,
        duration: 0.22,
        ease: 'power1.out',
      }, classroom.windowJumpAt);
      classroomTimeline.set(this.speedLines, { visible: true }, classroom.windowJumpAt);
      classroomTimeline.to(this.speedLines, {
        alpha: 0.9,
        duration: 0.08,
        ease: 'none',
      }, classroom.windowJumpAt);
      classroomTimeline.to(this.speedLines, {
        alpha: 0,
        duration: 0.25,
        ease: 'power1.out',
      }, classroom.windowJumpAt + 0.25);
      classroomTimeline.set(this.teacher.root, { visible: false }, classroom.windowExitAt);
      classroomTimeline.set(this.teacher.visual.scale, { x: 1, y: 1 }, classroom.windowExitAt);
      classroomTimeline.addLabel('classroom:end', classroom.windowExitAt);
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
    this.resetContainer(this.bellIndicator, false);
    if (this.doorOpenBg && this.doorClosedBg && this.deskEmpty && this.deskWithBooks) {
      this.doorOpenBg.visible = true;
      this.doorClosedBg.visible = false;
      this.deskEmpty.visible = true;
      this.deskWithBooks.visible = false;
    }
    this.grayboxStudents.visible = false;
    this.grayboxDesks.visible = false;
    this.dialogue?.reset();
    this.teacher.reset();
    this.resetTeacherForEntrance();
  }

  isTeacherReset(): boolean {
    const classroom = MOVIE_CONFIG.classroom;
    const environmentReset = Boolean(
      this.doorOpenBg &&
      this.doorClosedBg &&
      this.deskEmpty &&
      this.deskWithBooks &&
      this.doorOpenBg.visible &&
      !this.doorClosedBg.visible &&
      this.deskEmpty.visible &&
      !this.deskWithBooks.visible,
    );
    return (
      environmentReset &&
      nearlyEqual(this.teacher.root.x, classroom.offscreenLeft) &&
      nearlyEqual(this.teacher.root.y, classroom.teacherGroundY) &&
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
    this.dialogue?.destroy();
    this.activeTimeline = undefined;
    this.context = undefined;
    this.root.removeChildren();
    this.built = false;
  }

  private addTalkPoseSwitches(timeline: GsapTimeline, startAt: number, endAt: number): void {
    let frame = 1;
    for (let at = startAt + MOVIE_CONFIG.classroom.talkFrameDuration; at < endAt; at += MOVIE_CONFIG.classroom.talkFrameDuration) {
      const pose = frame % 2 === 1 ? 'talk2' : 'talk1';
      timeline.call(() => this.teacher.setPose(pose), [], at);
      frame += 1;
    }
  }

  private addSprintPoseSwitches(timeline: GsapTimeline, startAt: number, endAt: number): void {
    timeline.call(() => this.teacher.setPose('run1'), [], startAt);
    let frame = 1;
    for (let at = startAt + MOVIE_CONFIG.classroom.sprintFrameDuration; at < endAt; at += MOVIE_CONFIG.classroom.sprintFrameDuration) {
      const pose = frame % 2 === 1 ? 'run2' : 'run1';
      timeline.call(() => this.teacher.setPose(pose), [], at);
      frame += 1;
    }
  }

  private addDialogue(timeline: GsapTimeline, options: DialogueOptions): void {
    if (!this.dialogue) return;

    timeline.addLabel(options.label, options.at);
    timeline.call(() => this.dialogue?.setLine(options.speaker, options.text), [], options.at);
    timeline.to(this.dialogue.root, {
      autoAlpha: 1,
      duration: 0.12,
      ease: 'power1.out',
    }, options.at);
    timeline.to(this.dialogue.root, {
      autoAlpha: 0,
      duration: 0.12,
      ease: 'power1.in',
    }, Math.max(options.at, options.endAt - 0.12));
  }

  private triggerBell(): void {
    this.bellIndicator.visible = true;
  }

  private createEnvironmentLayers(): void {
    if (this.doorOpenBg || this.doorClosedBg || this.deskEmpty || this.deskWithBooks) return;

    const backgroundScale = Math.max(
      GAME_WIDTH / Math.max(this.environmentTextures.doorOpen.width, this.environmentTextures.doorClosed.width),
      GAME_HEIGHT / Math.max(this.environmentTextures.doorOpen.height, this.environmentTextures.doorClosed.height),
    );
    this.doorOpenBg = this.createBackgroundSprite(
      this.environmentTextures.doorOpen,
      'doorOpenBg',
      backgroundScale,
    );
    this.doorClosedBg = this.createBackgroundSprite(
      this.environmentTextures.doorClosed,
      'doorClosedBg',
      backgroundScale,
    );
    this.doorClosedBg.visible = false;
    this.backgroundLayer.addChild(this.doorOpenBg, this.doorClosedBg);

    this.deskEmpty = this.createDeskSprite(
      this.environmentTextures.deskEmpty,
      'deskEmpty',
    );
    this.deskWithBooks = this.createDeskSprite(
      this.environmentTextures.deskWithBooks,
      'deskWithBooks',
    );
    this.deskWithBooks.visible = false;
    this.deskLayer.addChild(this.deskEmpty, this.deskWithBooks);
  }

  private createBackgroundSprite(texture: Texture, label: string, scale: number): Sprite {
    const background = new Sprite(texture);
    background.label = label;
    background.anchor.set(0.5);
    background.scale.set(scale);
    background.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    return background;
  }

  private createDeskSprite(texture: Texture, label: string): Sprite {
    const desk = new Sprite(texture);
    desk.label = label;
    desk.anchor.set(0.5, 1);
    desk.scale.set(0.16);
    desk.position.set(GAME_WIDTH / 2, GAME_HEIGHT);
    return desk;
  }

  private createClock(): Container {
    const clock = new Container({ label: 'classroomClock' });
    clock.position.set(470, 56);
    clock.addChild(new Graphics()
      .circle(0, 0, 17)
      .fill(COLORS.clock)
      .stroke({ color: COLORS.ink, width: 3 })
      .circle(0, 0, 2)
      .fill(COLORS.clockHand)
      .moveTo(0, 0)
      .lineTo(0, -10)
      .moveTo(0, 0)
      .lineTo(8, 5)
      .stroke({ color: COLORS.clockHand, width: 2 }));
    clock.addChild(this.createText('CLOCK', -17, 22, COLORS.ink));
    return clock;
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

  private createBellIndicator(): void {
    this.bellIndicator.position.set(535, 38);
    this.bellIndicator.addChild(new Graphics()
      .roundRect(-20, -11, 40, 22, 3)
      .fill({ color: COLORS.ink, alpha: 0.92 })
      .stroke({ color: COLORS.accent, width: 2 }));
    const label = new Text({
      text: 'BELL!',
      style: {
        fill: COLORS.accent,
        fontFamily: 'monospace',
        fontSize: 9,
        fontWeight: '700',
      },
    });
    label.anchor.set(0.5);
    this.bellIndicator.addChild(label);
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

  private resetTeacherForEntrance(): void {
    const classroom = MOVIE_CONFIG.classroom;
    this.teacher.root.position.set(classroom.offscreenLeft, classroom.teacherGroundY);
    this.teacher.root.rotation = 0;
    this.teacher.root.scale.set(1, 1);
    this.teacher.root.pivot.set(0, 0);
    this.teacher.root.skew.set(0, 0);
    this.teacher.root.alpha = 1;
    this.teacher.root.visible = false;
  }
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.0001;
}
