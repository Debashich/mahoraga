cmake_policy(SET CMP0135 NEW)
cmake_minimum_required(VERSION 3.14)
project(mahoraga CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
FetchContent_Declare(json URL https://github.com/nlohmann/json/releases/download/v3.11.2/json.tar.xz)
FetchContent_MakeAvailable(json)

add_executable(mahoraga-run
    runtime/main.cpp
    runtime/core/Runtime.cpp
    runtime/core/Dispatcher.cpp
    runtime/providers/linux/LinuxProvider.cpp
)

target_include_directories(mahoraga-run PRIVATE runtime)
target_link_libraries(mahoraga-run PRIVATE nlohmann_json)