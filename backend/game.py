"""Fictional municipality and experimental encoder/decoder. No Brian dependency."""
from dataclasses import asdict, dataclass, replace

CHANNELS = ("public", "market", "oversight")
ACTIONS = ("Servicio público", "Atajo discrecional", "Revisión técnica")
MAX_DAYS = 10


@dataclass(frozen=True)
class State:
    day: int = 1
    treasury: int = 12000  # thousands of imaginary pesos
    corruption: int = 18
    satisfaction: int = 66
    audit: int = 22


@dataclass(frozen=True)
class Ruling:
    title: str
    quote: str
    consequence: str
    effect: tuple[int, int, int, int]


@dataclass(frozen=True)
class Issue:
    title: str
    office: str
    brief: str
    signals: tuple[int, int, int]
    rulings: tuple[Ruling, Ruling, Ruling]


ISSUES = {
    "water": Issue("Agua en números rojos", "Servicios públicos",
        "Dos colonias llevan tres días sin agua. Un consorcio ofrece pipas gratis a cambio de prioridad para su próximo resort.",
        (72, 42, 40), (
            Ruling("Pipas para las colonias", "El agua es de todos. La fila también.", "Llegan pipas municipales; el municipio cubre el operativo.", (-1850, -3, 17, -3)),
            Ruling("Pipas con patrocinador", "No es privatización. Es agua con logotipo.", "Las pipas salen, pero los hoteles reciben prioridad.", (850, 15, -10, 13)),
            Ruling("Medición de emergencia", "El agua está por verse. Por medirse, seguro.", "Una inspección busca fugas mientras las colonias siguen esperando.", (-350, -2, -8, -4)),
        )),
    "contract": Issue("La avenida de los primos", "Obras públicas",
        "El único postor cobró dos veces por la misma glorieta. El comité necesita resolver si firma el nuevo contrato.",
        (46, 77, 63), (
            Ruling("Relicitar con observadores", "La glorieta puede dar vueltas. La factura, no.", "Se cancela el contrato y se abre un concurso público.", (-850, -12, 9, -9)),
            Ruling("Adjudicación exprés", "Conozco al proveedor. ¡Eso ahorra referencias!", "La obra arranca, pero crece la sospecha de favoritismo.", (1100, 20, -8, 15)),
            Ruling("Congelar y peritar", "Hasta la glorieta merece el beneficio de la duda.", "El expediente pasa a revisión y se aplaza la pavimentación.", (-500, -7, -4, -10)),
        )),
    "hotel": Issue("Un hotel para la duna", "Desarrollo urbano",
        "Prometen empleos y dinero para el municipio. El plano del nuevo hotel corta el único acceso público a Playa Mosquito.",
        (54, 81, 41), (
            Ruling("Salvar el acceso público", "Si la playa no tiene puerta, no necesita recepcionista.", "El proyecto pierde permisos hasta restituir el paso público.", (-900, -5, 13, -4)),
            Ruling("Permiso preferente", "La vista al mar se democratiza por reservación.", "Entran derechos de construcción; el camino se cierra.", (2700, 13, -13, 11)),
            Ruling("Pedir un nuevo plano", "La duna no firmó el consentimiento.", "La oficina exige otro diseño y retrasa la inversión.", (-200, -3, 2, -6)),
        )),
    "audit": Issue("Auditoría sorpresa", "Contraloría",
        "La contralora pide las facturas originales del alumbrado. Tres tienen el mismo folio y una viene firmada con un ala.",
        (48, 39, 87), (
            Ruling("Publicar las cuentas", "Si encuentran el original, por favor también mándenmelo.", "Se abren los archivos y se paga una revisión externa.", (-1200, -15, 10, -20)),
            Ruling("Sellar el archivo", "No ocultamos nada. Custodiamos el misterio.", "La contraloría amplía la investigación y aplica una multa.", (-1800, 14, -14, 22)),
            Ruling("Conciliar folios", "Un duplicado no es un problema. Tres ya son un comité.", "Se cotejan facturas con el banco antes de remitirlas.", (-550, -8, 1, -16)),
        )),
    "protest": Issue("La plaza está zumbando", "Gobernación",
        "Vecinas y comerciantes ocupan la plaza. Piden agua, acceso a la playa y una respuesta que no sea otro comité.",
        (84, 45, 57), (
            Ruling("Cabildo abierto", "Se abre el micrófono. No prometo que no zumbe.", "El municipio financia un acuerdo público con los barrios.", (-1450, -6, 16, -7)),
            Ruling("Despejar la plaza", "Hay plena libertad de reunión en otro lugar.", "La plaza se vacía; la protesta se extiende a las colonias.", (-500, 9, -20, 12)),
            Ruling("Mediación vecinal", "El comité ahora tiene sillas para todos.", "Se pacta una pausa a cambio de fechas y actas públicas.", (-700, -4, 6, -5)),
        )),
}

FOCUSES = {"neutral": None, "citizens": 0, "business": 1, "audit": 2}


def encode(issue: Issue, state: State, focus: str) -> tuple[int, int, int]:
    signals = [issue.signals[0] + (66-state.satisfaction)//3,
               issue.signals[1] + (12000-state.treasury)//420,
               issue.signals[2] + (state.audit-22)//3 + (state.corruption-18)//6]
    if FOCUSES[focus] is not None:
        signals[FOCUSES[focus]] += 28
    return tuple(max(12, min(125, n)) for n in signals)


def decode(counts: list[int]) -> int | None:
    """Equal-size, disjoint readout panels. Zero or tied maxima give no mandate."""
    if len(counts) != len(CHANNELS) or any(x < 0 for x in counts):
        raise ValueError("Expected three nonnegative spike counts")
    best = max(counts)
    return counts.index(best) if best > 0 and counts.count(best) == 1 else None


def ending(state: State) -> str | None:
    if state.treasury <= 0:
        return "Tesorería intervenida: el municipio se quedó sin fondos."
    if state.audit >= 100 or state.corruption >= 100:
        return "Municipio intervenido: la contraloría tomó el control."
    if state.satisfaction <= 0:
        return "Mandato revocado: la plaza se quedó con el micrófono."
    if state.day > MAX_DAYS:
        return ("Mandato renovado: el cabildo conserva la confianza vecinal."
                if state.satisfaction >= 60 and state.corruption <= 40
                else "Fin de mandato: la ciudadanía exige un cambio de rumbo.")
    return None


def resolve(state: State, issue: Issue, counts: list[int]) -> dict:
    before = asdict(state)
    winner = decode(counts)
    ruling = issue.rulings[winner] if winner is not None else Ruling(
        "Sin resolución", "El cabildo pide un minuto de silencio administrativo.",
        "Sin una señal ganadora, el expediente se aplaza y la espera cuesta.", (-250, 0, -5, 2))
    values = [max(0, before[k] + change) for k, change in zip(
        ("treasury", "corruption", "satisfaction", "audit"), ruling.effect)]
    after = replace(state, day=state.day+1, treasury=values[0],
                    corruption=min(100, values[1]), satisfaction=min(100, values[2]), audit=min(100, values[3]))
    return {"winner": winner, "ruling": asdict(ruling), "state": asdict(after),
            "changes": {key: getattr(after, key)-before[key] for key in before if key != "day"},
            "ending": ending(after)}
