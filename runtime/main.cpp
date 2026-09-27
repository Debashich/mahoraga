#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <cstdint>
#include <iterator>

#include <nlohmann/json.hpp>

#include "core/Runtime.hpp"

#ifdef _WIN32
#include "providers/windows/WindowsProvider.hpp"
#else
#include "providers/linux/LinuxProvider.hpp"
#endif

int main(int argc, char* argv[]) {
    if (argc != 2) {
        std::cerr << "Usage: odin-run <path_to_payload>\n";
        return 1;
    }

    std::cout << "=== Odin Runtime Execution ===" << std::endl;

    try {
        // 1. Read encrypted binary payload
        std::ifstream file(argv[1], std::ios::binary);

        if (!file.is_open()) {
            std::cerr << "[Error] Could not open payload: "
                      << argv[1] << std::endl;
            return 1;
        }

        std::vector<uint8_t> buffer(
            (std::istreambuf_iterator<char>(file)),
            std::istreambuf_iterator<char>()
        );

        file.close();

        if (buffer.size() < 16) {
            std::cerr << "[Error] Payload too small or corrupted."
                      << std::endl;
            return 1;
        }

        // 2. Extract the 16-byte payload key
        std::vector<uint8_t> key(
            buffer.begin(),
            buffer.begin() + 16
        );

        // 3. Decrypt JSON in memory
        std::string decrypted_json;
        decrypted_json.resize(buffer.size() - 16);

        for (size_t i = 16; i < buffer.size(); ++i) {
            decrypted_json[i - 16] =
                static_cast<char>(
                    buffer[i] ^ key[(i - 16) % 16]
                );
        }

        // 4. Parse decrypted IR
        nlohmann::json instruction_contract;

        try {
            instruction_contract =
                nlohmann::json::parse(decrypted_json);
        }
        catch (const nlohmann::json::parse_error& e) {
            std::cerr << "[Error] Failed to parse decrypted IR: "
                      << e.what() << std::endl;
            return 1;
        }

        std::cout << "[OK] Payload decrypted and parsed."
                  << std::endl;

        std::unique_ptr<Provider> provider;
#ifdef _WIN32
        provider = std::make_unique<WindowsProvider>();
#else
        provider = std::make_unique<LinuxProvider>();
#endif
        Runtime runtime(std::move(provider));
        runtime.execute(instruction_contract);

        return 0;
    }
    catch (const std::exception& e) {
        std::cerr << "Runtime Error: "
                  << e.what() << "\n";
        return 1;
    }
}