import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const corpusPath = new URL('../corpus.txt', import.meta.url).pathname;
const modelPath = new URL('./vectors.txt', import.meta.url).pathname;

// Cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

class Word2VecModel {
    private vectors: Map<string, number[]> = new Map();
    private dimensions: number = 0;

    constructor(filePath: string) {
        // Parse the vectors.txt file directly!
        const cleanPath = os.platform() === 'win32' && filePath.startsWith('/') ? filePath.slice(1) : filePath;
        const content = fs.readFileSync(cleanPath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim() !== '');
        
        const [vocabSize, dims] = lines[0].split(' ').map(Number);
        this.dimensions = dims;

        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].trim().split(' ');
            const word = parts[0];
            const values = parts.slice(1).map(Number);
            this.vectors.set(word, values);
        }
    }

    getVectors() {
        return Array.from(this.vectors.keys()).map(word => ({
            word,
            values: this.vectors.get(word)
        }));
    }

    getVector(word: string) {
        const values = this.vectors.get(word);
        if (!values) return null;
        return { word, values };
    }

    getNearestWords(vec: {word: string, values: number[]}, count: number) {
        const results: {word: string, dist: number}[] = [];
        for (const [word, values] of this.vectors.entries()) {
            if (word === vec.word) continue;
            const dist = cosineSimilarity(vec.values, values);
            results.push({ word, dist });
        }
        results.sort((a, b) => b.dist - a.dist);
        return results.slice(0, count);
    }

    mostSimilar(phrase: string, count: number) {
        const words = phrase.split(' ');
        const validVecs = words.map(w => this.vectors.get(w)).filter(v => v !== undefined) as number[][];
        
        if (validVecs.length === 0) return [];

        const avgVec = new Array(this.dimensions).fill(0);
        for (const vec of validVecs) {
            for (let i = 0; i < this.dimensions; i++) {
                avgVec[i] += vec[i];
            }
        }
        for (let i = 0; i < this.dimensions; i++) {
            avgVec[i] /= validVecs.length;
        }

        const results: {word: string, dist: number}[] = [];
        for (const [word, values] of this.vectors.entries()) {
            if (words.includes(word)) continue;
            const dist = cosineSimilarity(avgVec, values);
            results.push({ word, dist });
        }
        results.sort((a, b) => b.dist - a.dist);
        return results.slice(0, count);
    }
}

export async function train() {
    console.log("⚠️ Saltando el entrenamiento nativo de 'word2vec' en C++ porque no es compatible con Windows sin Build Tools.");
    console.log("Usando el archivo 'vectors.txt' pre-entrenado existente en su lugar y calculando distancias en JavaScript puro.\n");
    return Promise.resolve();
}

export function softmax(scores: number[]): number[] {
    const max = Math.max(...scores);
    const exps = scores.map(s => Math.exp(s - max));
    const sumOfExps = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sumOfExps);
}

export async function evaluate() {
    const model = new Word2VecModel(modelPath);
    const vocab = model.getVectors().map(v => v.word);
    
    console.log("Vocabulary:", vocab.join(', '));
    console.log("Vocabulary Size:", vocab.length);

    console.log("\n--- Vector representation of 'cat' ---");
    console.log(model.getVector('cat'));

    console.log("\n--- Nearest Neighbors to 'cat' ---");
    const catVec = model.getVector('cat');
    if (catVec) {
        const nearestCat = model.getNearestWords(catVec, vocab.length);
        const probabilities = softmax(nearestCat.map(n => n.dist));
        nearestCat.forEach((n, i) => {
            console.log(`${n.word}: Similarity ${n.dist.toFixed(4)} | Probability ${(probabilities[i] * 100).toFixed(2)}%`);
        });
    }

    console.log("\n--- Nearest Neighbors to 'dog' ---");
    const dogVec = model.getVector('dog');
    if (dogVec) {
        const nearestDog = model.getNearestWords(dogVec, vocab.length);
        const probabilities = softmax(nearestDog.map(n => n.dist));
        nearestDog.forEach((n, i) => {
            console.log(`${n.word}: Similarity ${n.dist.toFixed(4)} | Probability ${(probabilities[i] * 100).toFixed(2)}%`);
        });
    }
}

export async function evaluateCbow() {
    const model = new Word2VecModel(modelPath);
    const vocab = model.getVectors().map(v => v.word);

    console.log("\n--- Inferring context around 'sat on' ---");
    const satOn = model.mostSimilar('sat on', vocab.length);
    if (satOn && satOn.length > 0) {
        const probabilities = softmax(satOn.map(n => n.dist));
        satOn.forEach((n, i) => {
            console.log(`${n.word}: Similarity ${n.dist.toFixed(4)} | Probability ${(probabilities[i] * 100).toFixed(2)}%`);
        });
    }

    console.log("\n--- Inferring context around 'ran to' ---");
    const ranTo = model.mostSimilar('ran to', vocab.length);
    if (ranTo && ranTo.length > 0) {
        const probabilities = softmax(ranTo.map(n => n.dist));
        ranTo.forEach((n, i) => {
            console.log(`${n.word}: Similarity ${n.dist.toFixed(4)} | Probability ${(probabilities[i] * 100).toFixed(2)}%`);
        });
    }
}

export async function main() {
    try {
        await train();
        await evaluate();
    } catch (error) {
        console.error("Execution failed:", error);
        process.exit(1);
    }
}

// Automatically run main if this file is executed directly 
if (process.argv[1] === __filename) {
    main();
}
