package services

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"

	"gorm.io/gorm"
	"hackerrank-server/models"
)

// Curated vocabulary strictly focused on technology, science, and programming.
var (
	TechAdverbs = []string{
		"recursively", "dynamically", "asynchronously", "concurrently", "statically",
		"cryptographically", "deterministically", "atomically", "linearly", "logarithmically",
		"algorithmically", "heuristically", "seamlessly", "robustly", "programmatically",
		"iteratively", "polymorphically", "declaratively", "imperatively", "securely",
		"efficiently", "automatically", "systematically", "serially", "infinitely",
		"digitally", "optically", "syntactically", "semantically", "topologically",
		"orthogonally", "symbolically", "continuously", "natively", "densely",
		"computationally", "kinetically", "magnetically", "quantumly", "structurally",
		"modularly", "relationaly", "spatially", "temporally", "vectorially",
	}

	TechVerbs = []string{
		"compile", "execute", "render", "parse", "deploy",
		"optimize", "traverse", "mutate", "serialize", "deserialize",
		"encrypt", "decrypt", "synthesize", "allocate", "calibrate",
		"refactor", "benchmark", "stream", "pipeline", "index",
		"bootstrap", "dispatch", "synchronize", "orchestrate", "tokenize",
		"cache", "compute", "resolve", "deconstruct", "propagate",
		"transform", "override", "vectorize", "interpolate", "compress",
		"validate", "integrate", "iterate", "amplify", "decode",
		"encode", "simulate", "transpile", "isolate", "instantiate",
		"intercept", "sanitize", "rebalance", "override", "streamline",
	}

	TechAdjectives = []string{
		"quantum", "neural", "binary", "atomic", "cyber",
		"matrix", "reactive", "modular", "immutable", "distributed",
		"polymorphic", "recursive", "asynchronous", "deterministic", "cryptographic",
		"algorithmic", "syntactic", "semantic", "topological", "orthogonal",
		"hexadecimal", "kinetic", "magnetic", "photonic", "prismatic",
		"synaptic", "isometric", "heuristic", "stateless", "concurrent",
		"monolithic", "vectorized", "spectral", "dynamic", "relational",
		"temporal", "discrete", "stochastic", "cellular", "resonant",
		"scalar", "infinite", "hypersonic", "faultless", "isomorphic",
		"declarative", "stateless", "parallel", "hyperbolic", "cybernetic",
	}

	TechNouns = []string{
		"kernel", "syntax", "tensor", "matrix", "qubit",
		"daemon", "flux", "algorithm", "vector", "buffer",
		"socket", "pipeline", "node", "cluster", "lattice",
		"lambda", "schema", "protocol", "bytecode", "stack",
		"heap", "thread", "mutex", "semaphore", "compiler",
		"parser", "runtime", "register", "packet", "router",
		"operand", "monad", "closure", "proxy", "gateway",
		"nexus", "automaton", "circuit", "transistor", "neuron",
		"prism", "photon", "plasma", "catalyst", "isotope",
		"frequency", "wavelet", "topology", "entropy", "manifold",
		"hypervisor", "payload", "interface", "module", "iterator",
		"checksum", "hyperplane", "coroutine", "microkernel", "subroutine",
	}
)

func randomElement(list []string) string {
	if len(list) == 0 {
		return ""
	}
	nBig, err := rand.Int(rand.Reader, big.NewInt(int64(len(list))))
	if err != nil {
		return list[0]
	}
	return list[nBig.Int64()]
}

func randomInt(max int) int {
	if max <= 0 {
		return 0
	}
	nBig, err := rand.Int(rand.Reader, big.NewInt(int64(max)))
	if err != nil {
		return 0
	}
	return int(nBig.Int64())
}

// GenerateTechToken generates a meaningful 3 to 4 word token combining
// tech/science/programming related adverbs, verbs, adjectives, and nouns.
// It has NO random alphanumeric characters.
func GenerateTechToken() string {
	// Patterns:
	// 3-word combinations:
	// 0: adverb - verb - noun (e.g. recursively-compile-kernel)
	// 1: adverb - adjective - noun (e.g. dynamically-quantum-matrix)
	// 2: verb - adjective - noun (e.g. optimize-neural-vector)
	// 3: adjective - verb - noun (e.g. atomic-render-pipeline)
	// 4: adjective - adjective - noun (e.g. immutable-binary-syntax)
	//
	// 4-word combinations:
	// 5: adverb - verb - adjective - noun (e.g. securely-deploy-neural-cluster)
	// 6: adverb - adjective - adjective - noun (e.g. cryptographically-immutable-quantum-ledger)
	// 7: verb - adverb - adjective - noun (e.g. compile-dynamically-modular-bytecode)
	// 8: adjective - noun - verb - noun (e.g. quantum-matrix-traverse-lattice)
	// 9: adverb - adjective - verb - noun (e.g. deterministically-atomic-resolve-state)

	pattern := randomInt(10)
	var words []string

	switch pattern {
	case 0:
		words = []string{randomElement(TechAdverbs), randomElement(TechVerbs), randomElement(TechNouns)}
	case 1:
		words = []string{randomElement(TechAdverbs), randomElement(TechAdjectives), randomElement(TechNouns)}
	case 2:
		words = []string{randomElement(TechVerbs), randomElement(TechAdjectives), randomElement(TechNouns)}
	case 3:
		words = []string{randomElement(TechAdjectives), randomElement(TechVerbs), randomElement(TechNouns)}
	case 4:
		words = []string{randomElement(TechAdjectives), randomElement(TechAdjectives), randomElement(TechNouns)}
	case 5:
		words = []string{randomElement(TechAdverbs), randomElement(TechVerbs), randomElement(TechAdjectives), randomElement(TechNouns)}
	case 6:
		words = []string{randomElement(TechAdverbs), randomElement(TechAdjectives), randomElement(TechAdjectives), randomElement(TechNouns)}
	case 7:
		words = []string{randomElement(TechVerbs), randomElement(TechAdverbs), randomElement(TechAdjectives), randomElement(TechNouns)}
	case 8:
		words = []string{randomElement(TechAdjectives), randomElement(TechNouns), randomElement(TechVerbs), randomElement(TechNouns)}
	case 9:
		words = []string{randomElement(TechAdverbs), randomElement(TechAdjectives), randomElement(TechVerbs), randomElement(TechNouns)}
	default:
		words = []string{randomElement(TechAdverbs), randomElement(TechVerbs), randomElement(TechNouns)}
	}

	// Remove any accidental empty strings or duplicates if chosen in succession
	var cleaned []string
	seen := make(map[string]bool)
	for _, w := range words {
		w = strings.ToLower(strings.TrimSpace(w))
		if w != "" && !seen[w] {
			cleaned = append(cleaned, w)
			seen[w] = true
		}
	}

	// Guarantee at least 3 words
	if len(cleaned) < 3 {
		cleaned = []string{randomElement(TechAdverbs), randomElement(TechVerbs), randomElement(TechNouns)}
	}

	return strings.Join(cleaned, "-")
}

// GenerateUniqueTechToken creates a unique 3-4 word token verified against the database.
func GenerateUniqueTechToken(db *gorm.DB) string {
	for attempts := 0; attempts < 100; attempts++ {
		candidate := GenerateTechToken()
		var count int64
		if db != nil {
			if err := db.Model(&models.User{}).Where("token = ?", candidate).Count(&count).Error; err == nil && count == 0 {
				return candidate
			}
		} else {
			return candidate
		}
	}
	// Fallback with extra unique tech combo
	return fmt.Sprintf("%s-%s", GenerateTechToken(), randomElement(TechNouns))
}
