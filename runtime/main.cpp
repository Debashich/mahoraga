#include <iostream>
#include <memory>

#include "core/Runtime.hpp"

#ifdef _WIN32
#include "providers/windows/WindowsProvider.hpp"
#else
#include "providers/linux/LinuxProvider.hpp"
#endif

int main(int argc, char* argv[]) {
    if (argc != 2) {
        std::cerr << "Usage: odin-run <path_to_instruction.json>\n";
        return 1;
    }

    try {
#ifdef _WIN32
        auto provider = std::make_unique<WindowsProvider>();
#else
        auto provider = std::make_unique<LinuxProvider>();
#endif

        Runtime rt(std::move(provider));
        rt.loadAndExecute(argv[1]);

    } catch (const std::exception& e) {
        std::cerr << "Runtime Error: " << e.what() << "\n";
        return 1;
    }

    return 0;
}