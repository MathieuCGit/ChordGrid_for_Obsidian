import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

/**
 * Test de rendu visuel: la liaison A[8_] -> [_4] dans la même mesure doit être complète
 * et ne pas être rendue comme une demi-liaison (half tie).
 */
describe('Rendu des liaisons intra-mesure', () => {
  const input = '4/4 | D[4.]A[8_] [_4] D[4_] |';

  it('dessine une courbe complète entre A[8_] et [_4]', () => {
    const parser = new ChordGridParser();
    const grid = parser.parse(input).grid;
    const renderer = new SVGRenderer();
    const svg = renderer.render(grid);

    const paths = Array.from(svg.querySelectorAll('path'));
    // Chercher les paths avec data-start et data-end (liaisons complètes)
    const fullTies = paths.filter(p => p.hasAttribute('data-start') && p.hasAttribute('data-end'));
    const halfTies = paths.filter(p => p.hasAttribute('data-half-tie'));

    // Il doit exister au moins une liaison complète dans cette mesure
    expect(fullTies.length).toBeGreaterThan(0);

    // Identifier la note de départ A[8_] (première tieStart croche après D[4.])
    // data-start format: measure:chord:beat:note
    // On repère la liaison dont le start noteIndex est > 0 (après la blanche pointée) et end value noteIndex suit.
    const candidate = fullTies.find(p => {
      const start = p.getAttribute('data-start')!;
      const end = p.getAttribute('data-end')!;
      // mesureIndex doit être 0 pour les deux
      return start.startsWith('0:') && end.startsWith('0:');
    });
    expect(candidate).toBeDefined();

    // Cette liaison ne doit pas être marquée half
    if (candidate) {
      expect(candidate.hasAttribute('data-half-tie')).toBe(false);
    }

    // Aucune demi-liaison ne doit partir de la croche A dans cette mesure
    // Vérifier que toute demi-liaison (si présente pour D[4_]) n'utilise pas le même start index que la croche
    if (candidate) {
      const startRef = candidate.getAttribute('data-start');
      const conflictingHalf = halfTies.find(h => h.getAttribute('data-start') === startRef);
      expect(conflictingHalf).toBeUndefined();
    }
  });
});