import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal } from './Modal';

type Topic = { id: string; title: string; body: ReactNode };
type Group = { title: string; topics: Topic[] };

/**
 * What the numbers rest on: how the load model works, what it assumes and what it leaves out.
 * Opened from the About box. Keep it in step with the model in `model/calc.ts` and the README.
 */
const HELP: Group[] = [
  {
    title: 'Getting started',
    topics: [
      {
        id: 'what',
        title: 'What this tool is',
        body: (
          <>
            <p>
              Vehicle Load Estimator works out how the weight of your vehicle, its load and a towed trailer is shared between the axles and
              wheels, and checks each figure against the manufacturer's ratings. It is a <strong>static estimate to plan with</strong>: the
              combination standing still, on level ground or on a steady slope.
            </p>
            <p>
              It is not a weighbridge and not a compliance certificate. The only figures that count legally are measured ones, against the
              ratings on your vehicle's placard, the tow bar plate and the trailer's compliance plate.{' '}
              <strong>Always confirm on a weighbridge before you travel.</strong>
            </p>
          </>
        ),
      },
      {
        id: 'accuracy',
        title: 'How accurate is it?',
        body: (
          <>
            <p>The result is only as good as what goes in. In order of how much they matter:</p>
            <ol>
              <li>
                <strong>Weighbridge readings.</strong> With real readings the starting point is measured, and only items you add or move are
                estimated. Without them the kerb weight and an assumed front/rear split are used, which can be out by 100 kg or more per axle.
              </li>
              <li>
                <strong>Item masses and positions.</strong> A mass is exact if you weighed it; a position a few hundred millimetres out moves
                only a share of its weight between the axles (see <em>The vehicle as a beam</em>).
              </li>
              <li>
                <strong>Ratings.</strong> Values marked <span className="help-chip">placeholder</span> are typical, not published, figures.
                Replace them with the ones on your plates.
              </li>
              <li>
                <strong>Geometry.</strong> Wheelbase, tow ball position and trailer axle positions set the levers. Measure the tow ball from the
                rear axle centre; a 100 mm error in it changes the ball's lever on a 3 m wheelbase by about 3%.
              </li>
            </ol>
          </>
        ),
      },
    ],
  },
  {
    title: 'How the numbers are worked out',
    topics: [
      {
        id: 'beam',
        title: 'The vehicle as a beam',
        body: (
          <>
            <p>
              The vehicle is treated as a rigid beam on two supports, its axles. A mass <code>m</code> at <code>x</code> mm behind the front
              axle, on a wheelbase <code>L</code>, puts <code>m·(L−x)/L</code> on the front axle and <code>m·x/L</code> on the rear. Ahead of
              the front axle (a winch, a bull bar) it adds more than its own weight to the front and lifts the rear; behind the rear axle (a
              tow ball, a rear wheel carrier) it does the reverse.
            </p>
            <p>
              Each axle shares its load between its two wheels by the same lever rule over its track, so a mass off the centreline loads one
              side more.
            </p>
          </>
        ),
      },
      {
        id: 'trailer',
        title: 'The trailer',
        body: (
          <>
            <p>
              The trailer is a beam on the tow ball and its axle group: a mass <code>m</code> at <code>x</code> behind the ball, with the axles{' '}
              <code>a</code> behind it, puts <code>m·(a−x)/a</code> on the ball. Weight behind the axles lifts the ball.
            </p>
            <p>
              Its own weight is as weighed (or as plated) with the axles where they were then. Move the axles afterwards and its centre of mass
              stays where it was, so the ball weight changes accordingly.
            </p>
          </>
        ),
      },
      {
        id: 'hitching',
        title: 'Hitching up',
        body: (
          <p>
            The ball weight <code>B</code> sits <code>d</code> behind the vehicle's rear axle. The rear axle gains <code>B·(L+d)/L</code>, more
            than the ball weight itself, and the front axle loses <code>B·d/L</code>. That front axle unloading is what a weight distribution
            hitch is for.
          </p>
        ),
      },
      {
        id: 'wdh',
        title: 'Weight distribution hitch',
        body: (
          <>
            <p>
              The spring bars apply a couple <code>M</code> at the hitch. It moves <code>M/L</code> from the rear axle to the front and{' '}
              <code>M/a</code> onto the trailer's axles. <code>M</code> is chosen so the front axle gets back exactly the share of its lost load
              you set (100% restores it fully).
            </p>
            <p>
              The tow ball download checked against the tow bar rating is the static ball weight, before the WDH: that is how tow ball ratings
              are specified.
            </p>
          </>
        ),
      },
      {
        id: 'slope',
        title: 'Slope',
        body: (
          <>
            <p>
              On a gradient each mass acts as if it sat its height times the gradient further downhill, so climbing moves load from the front
              axle to the rear, and descending the other way. The higher the centre of mass, the bigger the shift.
            </p>
            <p>
              The trailer's weight along the road pulls on the tow ball, and that pull at ball height moves more load onto the vehicle's rear
              axle climbing, or its front descending.
            </p>
          </>
        ),
      },
      {
        id: 'headroom',
        title: '"Room for N kg more here"',
        body: (
          <p>
            For the selected item's position the tool adds a 1 kg test mass, sees how much each figure moves, and divides each rating's spare
            capacity by that. The smallest answer is the headroom, and the rating that sets it is named.
          </p>
        ),
      },
      {
        id: 'checks',
        title: 'The checks and their thresholds',
        body: (
          <>
            <p>
              Each figure turns <span className="help-near">amber</span> at 95% of its rating and <span className="help-over">red</span> over it.
              Redundant weighbridge readings must agree within ±20 kg or ±2%, whichever is larger. The towing guidelines are a ball weight of 8
              to 12% of the trailer's mass and no more than 10% front axle unloading. All of these can be changed under the check settings.
            </p>
            <p>
              The ball share and front axle unloading are guidelines (shown as warnings), not ratings. Everything else is checked against a
              manufacturer's figure.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: 'Assumptions',
    topics: [
      {
        id: 'unweighed',
        title: 'Before you weigh',
        body: (
          <p>
            Without readings the vehicle starts at its kerb weight (full tank, no driver or load), split between the axles by a typical front
            share for the model, usually marked placeholder. With only the total, or only one axle, the missing figures are estimated the same
            way. Wheels on one axle are taken as equal unless you weigh them separately. The tool says so in its notes every time it fills
            something in.
          </p>
        ),
      },
      {
        id: 'data',
        title: 'Vehicle and trailer data',
        body: (
          <>
            <p>
              Model figures come from manufacturers' brochures and Australian specification listings for the current model year. Where a figure
              is not published, or sources disagree, a typical value is used and marked <span className="help-chip">placeholder</span> next to the
              field until you change it or mark it verified. Specifications change between model years and options (a bull bar, a tow pack, a
              different tyre) change the figures that apply to your vehicle.
            </p>
            <p>The trailer types start with example dimensions and plate values, all placeholders.</p>
          </>
        ),
      },
      {
        id: 'cog',
        title: 'Centre of mass heights',
        body: (
          <>
            <p>
              Only the slope uses heights. The vehicle's own centre of mass is taken at <strong>40% of its overall height</strong>, and the
              trailer's at <strong>its floor plus a fifth of its body height</strong>. Items use the middle of their box as drawn.
            </p>
            <p>
              Real centres of mass are not published and vary with the body, fit-out and load. The slope results are therefore illustrative:
              they show the direction and rough size of the shift, not a figure to rely on.
            </p>
          </>
        ),
      },
      {
        id: 'items',
        title: 'Items',
        body: (
          <p>
            Each item is a point mass at the centre of its box. Items ticked <em>Was on the vehicle when weighed</em> are already in the
            readings, so they only count when moved or removed. Masses of templates (people, a fridge, a full water tank) are typical figures;
            enter your own.
          </p>
        ),
      },
      {
        id: 'tandem',
        title: 'Tandem axles',
        body: (
          <p>
            Tandem trailer axles are taken to share any change in load equally, from their weighbridge readings (or half the group each if not
            weighed separately), and each is checked against half the TGALR. That holds for load-sharing suspension (rocker roller, airbag) but
            not always for independent axles, which can carry unequal shares, especially when the trailer is not level.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Limitations',
    topics: [
      {
        id: 'static',
        title: 'It is static',
        body: (
          <>
            <p>The model is a combination standing still. It does not include:</p>
            <ul>
              <li>braking, acceleration and cornering, which move load between axles and sides, often by more than the static figures;</li>
              <li>bumps and corrugations, which multiply the loads for a moment;</li>
              <li>sway, pitching and the stability of the combination;</li>
              <li>wind, aerodynamic lift and drag;</li>
              <li>fuel and water used along the way.</li>
            </ul>
            <p>Leave a margin under each rating for these.</p>
          </>
        ),
      },
      {
        id: 'rigid',
        title: 'Rigid body, no suspension',
        body: (
          <p>
            The vehicle is a rigid beam. Suspension, tyre compression and the body squatting at the rear are left out, and so is the small
            change in the levers they cause. A four-wheel vehicle on uneven ground is statically indeterminate side to side: how load crosses
            between diagonals depends on the roll stiffness front and rear, which is not known, so each axle is split by its own lever only. On
            level ground this is the usual approximation for load planning.
          </p>
        ),
      },
      {
        id: 'centreline',
        title: 'Loads on the centreline',
        body: (
          <p>
            The tow ball, the weight distribution hitch and the slope all act on the centreline and are shared equally between the left and
            right wheels. A trailer loaded heavily to one side moves only its own axle loads sideways, not the vehicle's.
          </p>
        ),
      },
      {
        id: 'wdh-limits',
        title: 'Weight distribution hitch',
        body: (
          <>
            <p>
              The WDH is modelled as an ideal couple: you set the share it restores, and the tool does not work out what a given spring bar
              tension or chain link would give. Measure the front wheel arch height before and after to set it up.
            </p>
            <p>
              The GVM and payload count the ball weight that stays on the vehicle after the WDH has moved some of it onto the front axle and
              the trailer. That is the load the vehicle really carries, but some manufacturers and authorities ask you to count the full static
              ball weight against the GVM. If yours does, check the GVM with the WDH off.
            </p>
          </>
        ),
      },
      {
        id: 'slope-limits',
        title: 'Slope',
        body: (
          <ul>
            <li>The heights it rests on are assumed (see <em>Centre of mass heights</em>).</li>
            <li>
              The trailer is taken with its brakes off, so the vehicle holds its whole weight along the road. With the trailer's brakes on,
              less load moves onto the vehicle.
            </li>
            <li>
              Loads stay normalised to the masses: the slope's small reduction of the load on the road (cos θ, under 2% up to a 20% slope) is
              left out, so the figures compare directly with the level-ground ratings.
            </li>
            <li>A side slope (camber) is not modelled.</li>
          </ul>
        ),
      },
      {
        id: 'headroom-limits',
        title: 'Headroom',
        body: (
          <p>
            The headroom is worked out from a small test mass and assumes every figure grows in proportion. That is exact for the axle, mass and
            towing ratings. Near a tyre limit it can be slightly optimistic, because the most loaded tyre can change from one wheel to another
            as weight is added. Check the result with the item's real mass.
          </p>
        ),
      },
      {
        id: 'legal',
        title: 'Not legal advice',
        body: (
          <p>
            Which ratings apply, how they are measured and what you may tow depend on your vehicle's certification and on the rules where you
            drive, and some ratings depend on others (a lower towing capacity with a heavier load, for example) in ways only the manufacturer
            documents. The tool checks the figures you enter; it does not certify that a combination is legal or safe.
          </p>
        ),
      },
    ],
  },
];

const ALL = HELP.flatMap((g) => g.topics);

/** Help on how the load model works and what it assumes, with a topic list and search. */
export function HelpDialog({ onClose, initial }: { onClose: () => void; initial?: string }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(initial ?? ALL[0].id);
  const [matches, setMatches] = useState<Set<string> | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const sections = useRef(new Map<string, HTMLElement>());

  // Search the rendered text, so the topics stay plain JSX.
  useEffect(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return setMatches(null);
    const found = new Set<string>();
    for (const [id, el] of sections.current) {
      const text = (el.textContent ?? '').toLowerCase();
      if (words.every((w) => text.includes(w))) found.add(id);
    }
    setMatches(found);
  }, [query]);

  const shown = (id: string) => !matches || matches.has(id);
  const groups = useMemo(() => HELP.map((g) => ({ ...g, topics: g.topics.filter((t) => shown(t.id)) })).filter((g) => g.topics.length), [matches]);

  const go = (id: string) => {
    setActive(id);
    sections.current.get(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  useEffect(() => {
    if (initial) sections.current.get(initial)?.scrollIntoView({ block: 'start' });
  }, [initial]);

  // Highlight the topic being read.
  const onScroll = () => {
    const box = content.current;
    if (!box) return;
    const top = box.getBoundingClientRect().top + 24;
    let current = active;
    for (const t of ALL) {
      const el = sections.current.get(t.id);
      if (!el || !shown(t.id)) continue;
      if (el.getBoundingClientRect().top <= top) current = t.id;
    }
    if (box.scrollTop + box.clientHeight >= box.scrollHeight - 4) {
      const visible = ALL.filter((t) => shown(t.id));
      if (visible.length) current = visible[visible.length - 1].id;
    }
    if (current !== active) setActive(current);
  };

  return (
    <Modal title="Help: how it works, assumptions and limitations" onClose={onClose} className="help-modal">
      <div className="help">
        <nav className="help-nav" aria-label="Help topics">
          <input
            className="help-search"
            type="search"
            placeholder="Search the help"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search the help"
          />
          {groups.map((g) => (
            <div key={g.title} className="help-group">
              <div className="help-group-title">{g.title}</div>
              {g.topics.map((t) => (
                <button key={t.id} className={`help-link${t.id === active ? ' active' : ''}`} onClick={() => go(t.id)}>
                  {t.title}
                </button>
              ))}
            </div>
          ))}
          {matches && !matches.size && <p className="about-note">Nothing matches “{query}”.</p>}
        </nav>
        <div className="help-content" ref={content} onScroll={onScroll}>
          {HELP.map((g) => (
            <div key={g.title} hidden={!g.topics.some((t) => shown(t.id))}>
              <div className="help-content-group">{g.title}</div>
              {g.topics.map((t) => (
                <section
                  key={t.id}
                  id={`help-${t.id}`}
                  className="help-topic"
                  hidden={!shown(t.id)}
                  ref={(el) => {
                    if (el) sections.current.set(t.id, el);
                    else sections.current.delete(t.id);
                  }}
                >
                  <h3>{t.title}</h3>
                  {t.body}
                </section>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
