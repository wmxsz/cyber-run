import { GAME_CONFIG } from "../config/gameConfig.js";

export class CollisionSystem {
  constructor() {
    this.obstacleHits = [];
    this.picked = [];
    this.nearMisses = [];
    this.result = {
      obstacleHits: this.obstacleHits,
      picked: this.picked,
      nearMisses: this.nearMisses,
    };
  }

  check(player, obstacles, pickups) {
    this.obstacleHits.length = 0;
    this.picked.length = 0;
    this.nearMisses.length = 0;

    const p = player.getHitbox();

    obstacles.forEachActive((item) => {
      if (item.obj.userData.hit) return;
      const dx = Math.abs(item.obj.position.x - p.x);
      const dz = Math.abs(item.obj.position.z - p.z);
      if (dx > item.def.hitbox.x + p.halfX || dz > GAME_CONFIG.collisionZ) return;

      if (item.def.requiresSlide) {
        if (!player.isSliding) {
          item.obj.userData.hit = true;
          this.obstacleHits.push(item);
        } else {
          item.obj.userData.passed = true;
        }
      } else if (item.def.blocksAir) {
        const dy = Math.abs((item.def.hitCenterY ?? item.def.hitbox.y) - (p.y + p.halfY));
        if (dy < item.def.hitbox.y + p.halfY && !player.isJumping) {
          item.obj.userData.hit = true;
          this.obstacleHits.push(item);
        } else if (player.isJumping) {
          item.obj.userData.passed = true;
        }
      } else if (item.def.blocksGround && !player.isJumping) {
        item.obj.userData.hit = true;
        this.obstacleHits.push(item);
      } else if (item.def.blocksGround && player.isJumping && p.y < item.def.hitbox.y * 1.2) {
        item.obj.userData.hit = true;
        this.obstacleHits.push(item);
      }

      if (!item.obj.userData.hit && !item.obj.userData.passed && item.obj.position.z > 0.8 && dx <= GAME_CONFIG.nearMissDistance) {
        item.obj.userData.passed = true;
        this.nearMisses.push(item);
      }
    });

    pickups.forEachActive((obj) => {
      if (obj.userData.picked) return;
      const dx = obj.position.x - p.x;
      const dy = obj.position.y - (p.y + p.halfY);
      const dz = obj.position.z - p.z;
      if (dx * dx + dy * dy + dz * dz < GAME_CONFIG.pickupRadius ** 2) {
        obj.userData.picked = true;
        this.picked.push(obj);
      }
    });

    return this.result;
  }
}
