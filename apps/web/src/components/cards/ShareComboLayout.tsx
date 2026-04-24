import type { DestinyFixture, MemorialFixture } from "../../content/cardFixtures";
import { ShareFrameIcon } from "../../icons/ShareFrameIcon";
import { DestinyCard } from "./DestinyCard";
import { MemorialCard } from "./MemorialCard";

type Props = {
  memorial: MemorialFixture;
  destiny: DestinyFixture;
};

/**
 * Memorial + Destiny side-by-side shell (handbook §15.1 combo).
 * Static fixtures for M2; R2 / Browser Rendering in M11.
 */
export function ShareComboLayout({ memorial, destiny }: Props) {
  return (
    <section className="share-combo" aria-label="Memorial and destiny share preview">
      <div className="share-combo__label">
        <ShareFrameIcon />
        <span>Memorial + Destiny · share combo</span>
      </div>
      <div className="share-combo__grid">
        <div className="share-combo__panel">
          <MemorialCard data={memorial} compact linkedClassId={destiny.classId} linkedHeadline={destiny.headline} />
        </div>
        <div className="share-combo__bridge" aria-hidden="true">
          +
        </div>
        <div className="share-combo__panel">
          <DestinyCard data={destiny} compact />
        </div>
      </div>
    </section>
  );
}
