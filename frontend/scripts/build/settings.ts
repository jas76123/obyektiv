import type { Settings } from '@/contract';
import { plural } from '@/lib/format';
import { OBJECTS, OBJ_ORDER, CONTACTS } from '../seed';
import { demoCatalog, demoHolidays } from '../seed/demo';
import { AS_OF, obj, cameraState } from './context';
import { contactOf } from './portfolio';

export function buildSettings(objectId: string): Settings {
  const o = obj(objectId);
  const contractors = [...new Set(o.order.map((id) => o.works[id]!.contr))];
  return {
    as_of: AS_OF,
    object: { id: objectId, name: o.name, short_name: o.short },
    objects: OBJ_ORDER.map((id) => ({ id, short_name: OBJECTS[id]!.short })),
    plan_source: { kind: 'link', name: 'docs.google.com/spreadsheets/d/1aF9k…/edit', updated_at: '4 сен, 17:42' },
    week_mode: 5,
    holidays: demoHolidays(),
    acts: (o.acts ?? []).map(([date, reason]) => ({ date, reason })),
    zone_type: o.type,
    zones_label: o.zonelbl,
    cameras: o.camlist.map((c) => cameraState(objectId, c[0])),
    contacts: contractors.map((c) => contactOf(c, objectId)).filter((c) => c !== null),
    contractors_without_contact: contractors.filter((c) => !CONTACTS[`${c}|${objectId}`]),
    catalog: demoCatalog().map((e) => ({
      work_pattern: e.pattern,
      classes: e.classes,
      min_people: e.people,
      threshold: `${e.days} ${plural(e.days, ['день', 'дня', 'дней'])} с активностью`,
      comment: e.comment,
    })),
  };
}
