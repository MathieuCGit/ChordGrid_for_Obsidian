/**
 * Script pour valider toutes les mesures dans test_multiple_time_signatures.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { ChordGridParser } from '../src/parser/ChordGridParser';

// Lire le fichier markdown
const mdPath = path.join(__dirname, 'test_multiple_time_signatures.md');
const content = fs.readFileSync(mdPath, 'utf-8');

// Extraire tous les blocs chordgrid (utiliser \r?\n pour Windows/Unix)
const chordgridRegex = /```chordgrid\r?\n([\s\S]*?)```/g;
let match;
const errors: Array<{section: string, line: number, content: string, error: string}> = [];
let totalBlocks = 0;
let validBlocks = 0;

// Extraire aussi les titres de section pour le contexte
const lines = content.split('\n');
let currentSection = '';

console.log('🔍 Validation des mesures dans test_multiple_time_signatures.md\n');
console.log('='.repeat(80));

while ((match = chordgridRegex.exec(content)) !== null) {
    totalBlocks++;
    const chordgridContent = match[1].trim();
    
    // Trouver le numéro de ligne et la section
    const beforeMatch = content.substring(0, match.index);
    const lineNumber = beforeMatch.split('\n').length + 1;
    
    // Trouver la section précédente
    for (let i = lineNumber - 1; i >= 0; i--) {
        if (lines[i].startsWith('###')) {
            currentSection = lines[i].replace(/^###\s*/, '');
            break;
        }
    }
    
    try {
        const parser = new ChordGridParser();
        const result = parser.parse(chordgridContent);
        
        if (result.errors && result.errors.length > 0) {
            const errorMsg = result.errors.map(e => 
                typeof e === 'string' ? e : e.message || JSON.stringify(e)
            ).join('; ');
            errors.push({
                section: currentSection,
                line: lineNumber,
                content: chordgridContent,
                error: errorMsg
            });
            console.log(`❌ Ligne ${lineNumber} [${currentSection}]:`);
            console.log(`   ${chordgridContent}`);
            console.log(`   🔴 ${errorMsg}\n`);
        } else {
            validBlocks++;
            console.log(`✅ Ligne ${lineNumber} [${currentSection}]`);
        }
    } catch (e) {
        errors.push({
            section: currentSection,
            line: lineNumber,
            content: chordgridContent,
            error: e instanceof Error ? e.message : String(e)
        });
        console.log(`❌ Ligne ${lineNumber} [${currentSection}]:`);
        console.log(`   ${chordgridContent}`);
        console.log(`   💥 Exception: ${e}\n`);
    }
}

console.log('='.repeat(80));
console.log(`📊 Résumé de validation:`);
console.log(`   Total de blocs: ${totalBlocks}`);
console.log(`   Blocs valides: ${validBlocks} (${Math.round(validBlocks/totalBlocks*100)}%)`);
console.log(`   Blocs avec erreurs: ${errors.length}`);
console.log('='.repeat(80));

if (errors.length > 0) {
    console.log('\n🔴 Liste des erreurs par section:\n');
    
    // Grouper par section
    const errorsBySection = new Map<string, typeof errors>();
    errors.forEach(err => {
        if (!errorsBySection.has(err.section)) {
            errorsBySection.set(err.section, []);
        }
        errorsBySection.get(err.section)!.push(err);
    });
    
    errorsBySection.forEach((sectionErrors, section) => {
        console.log(`\n📍 ${section} (${sectionErrors.length} erreur(s)):`);
        sectionErrors.forEach(err => {
            console.log(`   Ligne ${err.line}: ${err.content}`);
            console.log(`   ❌ ${err.error}\n`);
        });
    });
    
    console.log('\n⚠️  Total: ' + errors.length + ' bloc(s) avec erreurs de validation\n');
    process.exit(1);
} else {
    console.log('\n✅ Tous les blocs chordgrid sont valides!\n');
    process.exit(0);
}
