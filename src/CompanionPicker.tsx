import { companions, type CompanionId } from "./companions";
import { Icon } from "./Icon";
function Portrait({id}:{id:CompanionId}) {
  return <img src={`${import.meta.env.BASE_URL}portraits/${id}.png`} alt="" style={{width:"100%",aspectRatio:"1",objectFit:"contain"}} />;
}
export function CompanionPicker({
  selected,
  onSelect,
  onClose,
}: {
  selected: CompanionId;
  onSelect: (id: CompanionId) => void;
  onClose: () => void;
}) {
  return (
    <section
      className="companion-picker floating-panel"
      role="dialog"
      aria-label="選擇陪伴角色"
    >
      <header>
        <div>
          <h2>今天，和誰一起？</h2>
          <p>九位小星球居民</p>
        </div>
        <button
          className="icon-button"
          aria-label="關閉角色選擇"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="companion-grid">
        {companions.map((c) => (
          <button
            key={c.id}
            disabled={c.id !== "nebula"}
            aria-pressed={selected === c.id}
            onClick={() => onSelect(c.id)}
          >
            <div className={c.id === "nebula" ? undefined : "companion-preview"}><Portrait {...c} /></div>
            <span>{c.name}</span>
            {c.id !== "nebula" && <small className="companion-preview-label">開發中</small>}
            {selected === c.id && <Icon name="check" />}
          </button>
        ))}
      </div>
    </section>
  );
}
