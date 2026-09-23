cmake_policy(SET CMP0135 NEW)
cmake_minimum_required(VERSION 3.14)
project(OdinRuntime CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
FetchContent_Declare(json URL https://github.com/nlohmann/json/releases/download/v3.11.2/json.tar.xz)
FetchContent_MakeAvailable(json)

add_executable(odin-run
    runtime/main.cpp
    runtime/core/Runtime.cpp
    runtime/core/Dispatcher.cpp
    runtime/providers/linux/LinuxProvider.cpp
)

target_include_directories(odin-run PRIVATE runtime nlohmann_json::nlohmann_json)
target_link_libraries(odin-run PRIVATE nlohmann_json::nlohmann_json)