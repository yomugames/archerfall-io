const Direction = {
  LEFT: 'left',
  TOP: 'top',
  BOTTOM: 'bottom',
  RIGHT: 'right',
  TOP_LEFT: 'top_left',
  TOP_RIGHT: 'top_right',
  BOTTOM_LEFT: 'bottom_left',
  BOTTOM_RIGHT: 'bottom_right',
}

class Joystick extends PIXI.Container {

  constructor(opts) {
    super();

    this.eventData = null
    this.outerRadius = 0;
    this.innerRadius = 0;
    this.innerAlphaStandby = 0.5;

    this.settings = Object.assign({
      outerScale: { x: 1, y: 1 },
      innerScale: { x: 1, y: 1 },
    }, opts);

    if (!this.settings.outer) {
      const outer = new PIXI.Graphics();
      outer.beginFill(0x000000);
      outer.drawCircle(0, 0, 60);
      outer.alpha = 0.5;
      this.settings.outer = outer;
    }

    if (!this.settings.inner) {
      const inner = new PIXI.Graphics();
      inner.beginFill(0x000000);
      inner.drawCircle(0, 0, 35);
      inner.alpha = this.innerAlphaStandby;
      this.settings.inner = inner;
    }

    this.initialize();
    this.myid = Math.random()
  }

  initialize() {
    this.startPosition = { x: 0, y: 0}
    this.outer = this.settings.outer;
    this.inner = this.settings.inner;

    this.inner.alpha = this.innerAlphaStandby
    this.outer.scale.set(this.settings.outerScale.x, this.settings.outerScale.y);
    this.inner.scale.set(this.settings.innerScale.x, this.settings.innerScale.y);

    if ('anchor' in this.outer) { this.outer.anchor.set(0.5); }
    if ('anchor' in this.inner) { this.inner.anchor.set(0.5); }

    this.addChild(this.outer);
    this.addChild(this.inner);

    // this.outerRadius = this.containerJoystick.width / 2;
    this.outerRadius = this.width / 2.5;
    this.innerRadius = this.inner.width / 2;

    this.bindEvents();
  }

  onPointerup(event) {
    this.onDragEnd(event)
  }

  onPointerupOutside(event) {
    this.onDragEnd(event)
  }

  onDragStart(event) {
    this.eventData = event.data;

    this.dragging = true;
    this.inner.alpha = 1;

    this.settings.onStart();

    this.onDragMove(event)
  }

  onDragMove(event) {
    if (this.dragging == false) { return; }

    if (!this.eventData) return
    let newPosition = this.eventData.getLocalPosition(this);

    let sideX = newPosition.x - this.startPosition.x;
    let sideY = newPosition.y - this.startPosition.y;

    let centerPoint = new PIXI.Point(0, 0);
    let angle = 0;

    if (sideX == 0 && sideY == 0) { return; }

    let calRadius = 0;

    if (sideX * sideX + sideY * sideY >= this.outerRadius * this.outerRadius) {
      calRadius = this.outerRadius;
    }
    else {
      calRadius = this.outerRadius - this.innerRadius;
    }

    /**
     * x:   -1 <-> 1
     * y:   -1 <-> 1
     *          Y
     *          ^
     *          |
     *     180  |  90
     *    ------------> X
     *     270  |  360
     *          |
     *          |
     */

    let direction = Direction.LEFT;

    if (sideX == 0) {
      if (sideY > 0) {
        centerPoint.set(0, (sideY > this.outerRadius) ? this.outerRadius : sideY);
        angle = 270;
        direction = Direction.BOTTOM;
      } else {
        centerPoint.set(0, -(Math.abs(sideY) > this.outerRadius ? this.outerRadius : Math.abs(sideY)));
        angle = 90;
        direction = Direction.TOP;
      }
      this.inner.position.set(centerPoint.x, centerPoint.y);
      const power = this.getPower(centerPoint);
      this.settings.onChange({ angle, direction, power, });
      return;
    }

    if (sideY == 0) {
      if (sideX > 0) {
        centerPoint.set((Math.abs(sideX) > this.outerRadius ? this.outerRadius : Math.abs(sideX)), 0);
        angle = 0;
        direction = Direction.LEFT;
      } else {
        centerPoint.set(-(Math.abs(sideX) > this.outerRadius ? this.outerRadius : Math.abs(sideX)), 0);
        angle = 180;
        direction = Direction.RIGHT;
      }

      this.inner.position.set(centerPoint.x, centerPoint.y);
      const power = this.getPower(centerPoint);
      this.settings.onChange({ angle, direction, power, });
      return;
    }

    let tanVal = Math.abs(sideY / sideX);
    let radian = Math.atan(tanVal);
    angle = radian * 180 / Math.PI;

    let centerX = 0;
    let centerY = 0;

    if (sideX * sideX + sideY * sideY >= this.outerRadius * this.outerRadius) {
      centerX = this.outerRadius * Math.cos(radian);
      centerY = this.outerRadius * Math.sin(radian);
    }
    else {
      centerX = Math.abs(sideX) > this.outerRadius ? this.outerRadius : Math.abs(sideX);
      centerY = Math.abs(sideY) > this.outerRadius ? this.outerRadius : Math.abs(sideY);
    }

    if (sideY < 0) {
      centerY = -Math.abs(centerY);
    }
    if (sideX < 0) {
      centerX = -Math.abs(centerX);
    }

    if (sideX > 0 && sideY < 0) {
      // < 90
    }
    else if (sideX < 0 && sideY < 0) {
      // 90 ~ 180
      angle = 180 - angle;
    }
    else if (sideX < 0 && sideY > 0) {
      // 180 ~ 270
      angle = angle + 180;
    }
    else if (sideX > 0 && sideY > 0) {
      // 270 ~ 369
      angle = 360 - angle;
    }
    centerPoint.set(centerX, centerY);
    const power = this.getPower(centerPoint);

    direction = this.getDirection(centerPoint);
    this.inner.position.set(centerPoint.x, centerPoint.y);

    this.settings.onChange({ angle, direction, power, });
  }

  onDragEnd(event) {
    if (this.dragging == false) { return; }

    // let newPosition = this.eventData.getLocalPosition(this);

    // let sideX = newPosition.x - this.startPosition.x;
    // let sideY = newPosition.y - this.startPosition.y;
    // let tanVal = Math.abs(sideY / sideX);
    // let radian = Math.atan(tanVal);
    // const angle = radian * 180 / Math.PI;
    // console.log("shoot angle end: " + angle)

    this.inner.position.set(0, 0);

    this.dragging = false;
    this.inner.alpha = this.innerAlphaStandby;

    this.settings.onEnd();
  }

  bindEvents() {
    this.interactive = true;

    this.on('pointerdown', this.onDragStart.bind(this))
      .on('pointerup', this.onPointerup.bind(this))
      .on('pointerupoutside', this.onPointerupOutside.bind(this))
      .on('pointermove', this.onDragMove.bind(this))
  }

  getPower(centerPoint) {
    const a = centerPoint.x - 0;
    const b = centerPoint.y - 0;
    return Math.min(1, Math.sqrt(a * a + b * b) / this.outerRadius);
  }

  getDirection(center) {
    let rad = Math.atan2(center.y, center.x);// [-PI, PI]
    if ((rad >= -Math.PI / 8 && rad < 0) || (rad >= 0 && rad < Math.PI / 8)) {
      return Direction.RIGHT;
    } else if (rad >= Math.PI / 8 && rad < 3 * Math.PI / 8) {
      return Direction.BOTTOM_RIGHT;
    } else if (rad >= 3 * Math.PI / 8 && rad < 5 * Math.PI / 8) {
      return Direction.BOTTOM;
    } else if (rad >= 5 * Math.PI / 8 && rad < 7 * Math.PI / 8) {
      return Direction.BOTTOM_LEFT;
    } else if ((rad >= 7 * Math.PI / 8 && rad < Math.PI) || (rad >= -Math.PI && rad < -7 * Math.PI / 8)) {
      return Direction.LEFT;
    } else if (rad >= -7 * Math.PI / 8 && rad < -5 * Math.PI / 8) {
      return Direction.TOP_LEFT;
    } else if (rad >= -5 * Math.PI / 8 && rad < -3 * Math.PI / 8) {
      return Direction.TOP;
    } else {
      return Direction.TOP_RIGHT;
    }
  }


}

module.exports = Joystick