// Details > Data & method: "Planning inputs: how each choice is used". The explanations that used to sit under each
// control in "Who you're planning for" (Place tab), gathered in one place. Text comes from lib/place/plan and copy.
import type { ReactNode } from 'react';
import { hud } from '../../lib/place/data';
import {
  AGE_NOTE, FLOOD_LABEL, FLOOD_LIMIT_PCT, FLOOD_RISKS, INCOME_LEVELS, LEVEL_LABEL, MILES_LABEL, PLAN_TYPE_LABEL, SIZE_RULE,
  TRANSIT_MILES, TYPE_PERSONS, TYPE_SIZE, ceilingForSize, sizeHomeWord, type FixedSize,
} from '../../lib/place/plan';
import { HOUSEHOLD_TYPE_ORDER } from '../../lib/place/thresholds';
import { FREQUENT_STOP_DEFINITION, STANCE_MEANING } from '../../lib/place/copy';
import { FOCUS } from './FocusPicker';

const SIZES: FixedSize[] = [1, 2, 3, 4, 5];
const usd = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;

function Item({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-stone-50 px-3 py-2 ring-1 ring-stone-200/70">
      <div className="text-small font-semibold text-slate-900">{title}</div>
      <div className="mt-0.5 space-y-1 text-caption leading-snug text-slate-700">{children}</div>
    </div>
  );
}

export default function PlanningInputsDetails() {
  return (
    <section id="planning-inputs" className="scroll-mt-28">
      <h3 className="mb-1 text-body font-semibold text-violet-800">Planning inputs: how each choice is used</h3>
      <p className="mb-2 text-small text-slate-700">The Place tab's "Who you're planning for" and "Focusing issue" choices are values, not weights: each one changes a rule's input.</p>
      <div className="grid gap-2">
        <Item title="Income level">
          <p>≤30% AMI reads the ≤30% band; ≤50% adds the 30–50% band; ≤80% adds the 50–80% band. The rent that fits = the HUD FY2026 income limit (Pittsburgh HMFA) for the household's size × 30% ÷ 12.</p>
          {hud && (
            <div className="overflow-x-auto rounded-md bg-white ring-1 ring-stone-200">
              <table className="w-full text-caption tnum">
                <thead className="bg-stone-50 text-slate-600">
                  <tr>
                    <th className="whitespace-nowrap px-2 py-1 text-left font-semibold">Income limit · rent/mo</th>
                    {SIZES.map((n) => (
                      <th key={n} className="whitespace-nowrap px-2 py-1 text-right font-semibold">
                        {n === 5 ? '5+ people' : n === 1 ? '1 person' : `${n} people`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {INCOME_LEVELS.map((l) => (
                    <tr key={l} className="border-t border-stone-100">
                      <td className="px-2 py-1 font-medium text-slate-800">{LEVEL_LABEL[l]}</td>
                      {SIZES.map((n) => {
                        const c = ceilingForSize(hud!, l, n);
                        return (
                          <td key={n} className="whitespace-nowrap px-2 py-1 text-right text-slate-700">
                            {c ? `${usd(c.limit)} · ${usd(c.rent)}` : '–'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p>Market rate reads the two bands above 80% AMI. No HUD ceiling applies: the price is what the market asks (the tract's 2-bedroom asking rent, else the ACS median rent), and the suggestion follows the Market-led test.</p>
        </Item>
        <Item title="Household size">
          <p>Sets the HUD limit and the home size: {SIZE_RULE}.</p>
          <p>
            <b>Largest group</b> (the default): each place uses its largest CHAS renter household type at your income level and age group, and takes size and home size from it. With no eligible type on file it prices at 3 people.
          </p>
          <ul className="ml-3 list-disc space-y-0.5">
            {HOUSEHOLD_TYPE_ORDER.map((t) => (
              <li key={t}>
                {PLAN_TYPE_LABEL[t]}: {TYPE_PERSONS[t]} → {sizeHomeWord(TYPE_SIZE[t])}
              </li>
            ))}
          </ul>
        </Item>
        <Item title="Age group">
          <p>Chooses which CHAS household types count. Under 62: single adults, small and large families. 62 and older: seniors living alone and senior families. {AGE_NOTE} CHAS counts every family of 3–4 people as a small family and every household of 5 or more as a large family, whatever the age.</p>
        </Item>
        <Item title="Homes needed (optional)">
          <p>N homes reach min(N, Q) of the Q qualifying renter households here (min(N, Q) ÷ Q = share served); homes beyond Q are "to spare".</p>
          <p>Yearly rent gap at 2-bedroom prices = (2-bedroom asking rent − 2-bedroom rent that fits) × 12 × N. At market rate there is no rent gap; with no usable asking rent it cannot be measured.</p>
        </Item>
        <Item title="Flood risk you accept">
          <p>
            {FLOOD_RISKS.map((f, i) => {
              const lim = FLOOD_LIMIT_PCT[f];
              return (
                <span key={f}>
                  {i > 0 ? '; ' : ''}
                  <b>{FLOOD_LABEL[f]}</b>: {lim == null ? 'no limit (the flood share is still shown)' : `no suggestion where more than ${lim}% of the tract's land is in a FEMA flood zone`}
                </span>
              );
            })}
            .
          </p>
        </Item>
        <Item title="Frequent transit within">
          <p>
            {TRANSIT_MILES.map((m) => MILES_LABEL[m]).join(', ')}. The transit test passes when the nearest frequent stop ({FREQUENT_STOP_DEFINITION}) is within that distance of where the average resident lives. Transit-first and Climate-resilient read it.
          </p>
        </Item>
        <Item title="Focusing issue">
          <ul className="space-y-0.5">
            {FOCUS.map((f) => (
              <li key={f.id}>
                <b>{f.label}</b>: {STANCE_MEANING[f.id]}
              </li>
            ))}
          </ul>
          <p>A focus applies its published weight preset, which only orders types inside the suggested set; the rules decide the set.</p>
        </Item>
      </div>
    </section>
  );
}
