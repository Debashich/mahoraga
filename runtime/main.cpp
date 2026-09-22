#include <iostream>
#include <memory>
#include "core/Runtime.hpp"
#include "providers/linux/LinuxProvider.hpp"

int main(int argc, char* argv[]) {
    if (argc != 2) {
        std::cerr << "Usage: odin-run <path_to_instruction.json>\n";
        return 1;
    }

    try {
        // Architecture specifies targeting specific Providers. Start with Linux.
        auto provider = std::make_unique<LinuxProvider>();
        Runtime rt(std::move(provider));
        
        rt.loadAndExecute(argv[1]);
    } catch (const std::exception& e) {
        std::cerr << "Runtime Error: " << e.what() << "\n";
        return 1;
    }

    return 0;
}